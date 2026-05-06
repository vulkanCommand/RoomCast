import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();

const db = getFirestore();
const ROOM_LIFETIME_MS = 1000 * 60 * 60 * 8;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function requireUid(uid?: string) {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in to continue.");
  return uid;
}

function makeRoomCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function authProfile(request: { auth?: { uid?: string; token?: Record<string, unknown> } }) {
  const uid = request.auth?.uid;
  const token = request.auth?.token;
  const displayName =
    (typeof token?.name === "string" && token.name.trim()) ||
    (typeof token?.email === "string" && token.email.split("@")[0]) ||
    "RoomCast Guest";
  return {
    displayName,
    email: typeof token?.email === "string" ? token.email : null,
    photoURL: typeof token?.picture === "string" ? token.picture : null,
    joinedAt: FieldValue.serverTimestamp(),
    role: uid ? "host" : "guest",
  };
}

async function uniqueRoomCode() {
  for (let i = 0; i < 8; i += 1) {
    const roomCode = makeRoomCode();
    const existing = await db.collection("rooms").where("roomCode", "==", roomCode).limit(1).get();
    if (existing.empty) return roomCode;
  }
  throw new HttpsError("resource-exhausted", "Could not allocate a room code. Try again.");
}

async function resolveRoom(roomIdOrCode: string) {
  const input = roomIdOrCode.trim();
  if (!input) throw new HttpsError("invalid-argument", "Room id or code is required.");

  const direct = await db.collection("rooms").doc(input).get();
  if (direct.exists) return direct;

  const byCode = await db.collection("rooms").where("roomCode", "==", input.toUpperCase()).limit(1).get();
  if (!byCode.empty) return byCode.docs[0];

  throw new HttpsError("not-found", "Room not found.");
}

export const createRoom = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const hostProfile = { ...authProfile(request), role: "host" };
  const name = typeof request.data?.name === "string" && request.data.name.trim()
    ? request.data.name.trim().slice(0, 80)
    : "Untitled room";
  const roomRef = db.collection("rooms").doc();
  const roomCode = await uniqueRoomCode();
  const expiresAt = Timestamp.fromMillis(Date.now() + ROOM_LIFETIME_MS);

  await roomRef.set({
    roomId: roomRef.id,
    roomCode,
    name,
    hostUid: uid,
    guestUid: null,
    participants: { [uid]: true },
    participantProfiles: { [uid]: hostProfile },
    status: "waiting",
    sharingStatus: "stopped",
    activeSessionId: null,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  return { roomId: roomRef.id, roomCode };
});

export const joinRoom = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const guestProfile = { ...authProfile(request), role: "guest" };
  const roomIdOrCode = String(request.data?.roomIdOrCode || "");
  const roomSnap = await resolveRoom(roomIdOrCode);
  const roomRef = roomSnap.ref;

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(roomRef);
    if (!fresh.exists) throw new HttpsError("not-found", "Room not found.");
    const room = fresh.data() || {};

    if (room.status === "ended") throw new HttpsError("failed-precondition", "This room has ended.");
    if (room.hostUid === uid) return;
    if (room.guestUid && room.guestUid !== uid) {
      throw new HttpsError("resource-exhausted", "This MVP room already has one host and one guest.");
    }

    tx.update(roomRef, {
      guestUid: uid,
      [`participants.${uid}`]: true,
      [`participantProfiles.${uid}`]: guestProfile,
      status: "connected",
      startedAt: room.startedAt || FieldValue.serverTimestamp(),
    });
  });

  const updated = await roomRef.get();
  return { roomId: updated.id, roomCode: updated.data()?.roomCode };
});

export const endRoom = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const roomId = String(request.data?.roomId || "");
  if (!roomId) throw new HttpsError("invalid-argument", "roomId is required.");

  const roomRef = db.collection("rooms").doc(roomId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists) throw new HttpsError("not-found", "Room not found.");
    const room = snap.data() || {};
    if (room.hostUid !== uid) throw new HttpsError("permission-denied", "Only the host can end this room.");
    const activeSessionId = typeof room.activeSessionId === "string" ? room.activeSessionId : null;
    tx.update(roomRef, {
      status: "ended",
      sharingStatus: "stopped",
      activeSessionId: null,
      endedAt: FieldValue.serverTimestamp(),
    });
    if (activeSessionId) {
      tx.set(roomRef.collection("sessions").doc(activeSessionId), {
        status: "stopped",
        stoppedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  });

  return { ok: true };
});

export const startRoomSession = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const roomId = String(request.data?.roomId || "");
  if (!roomId) throw new HttpsError("invalid-argument", "roomId is required.");

  const roomRef = db.collection("rooms").doc(roomId);
  const sessionRef = roomRef.collection("sessions").doc();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists) throw new HttpsError("not-found", "Room not found.");
    const room = snap.data() || {};
    if (room.hostUid !== uid) throw new HttpsError("permission-denied", "Only the host can start sharing.");
    if (room.status === "ended") throw new HttpsError("failed-precondition", "This room has ended.");

    const previousSessionId = typeof room.activeSessionId === "string" ? room.activeSessionId : null;
    if (previousSessionId) {
      tx.set(roomRef.collection("sessions").doc(previousSessionId), {
        status: "stopped",
        stoppedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    tx.set(sessionRef, {
      sessionId: sessionRef.id,
      status: "starting",
      offer: null,
      answer: null,
      createdAt: FieldValue.serverTimestamp(),
      hostUid: uid,
      guestUid: room.guestUid || null,
    });

    tx.update(roomRef, {
      activeSessionId: sessionRef.id,
      sharingStatus: "sharing",
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { sessionId: sessionRef.id };
});

export const stopRoomSession = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const roomId = String(request.data?.roomId || "");
  if (!roomId) throw new HttpsError("invalid-argument", "roomId is required.");

  const roomRef = db.collection("rooms").doc(roomId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists) throw new HttpsError("not-found", "Room not found.");
    const room = snap.data() || {};
    if (room.hostUid !== uid) throw new HttpsError("permission-denied", "Only the host can stop sharing.");

    const activeSessionId = typeof room.activeSessionId === "string" ? room.activeSessionId : null;
    tx.update(roomRef, {
      activeSessionId: null,
      sharingStatus: "stopped",
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (activeSessionId) {
      tx.set(roomRef.collection("sessions").doc(activeSessionId), {
        status: "stopped",
        stoppedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  });

  return { ok: true };
});

export const cleanupExpiredRooms = onSchedule("every 24 hours", async () => {
  const expired = await db.collection("rooms").where("expiresAt", "<=", Timestamp.now()).limit(100).get();
  const batch = db.batch();
  expired.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
});
