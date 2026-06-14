"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredRooms = exports.leaveRoom = exports.requestReconnect = exports.stopRoomSession = exports.startRoomSession = exports.endRoom = exports.joinRoom = exports.getQaBypassToken = exports.createRoom = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const adminAuth = (0, auth_1.getAuth)();
const ROOM_LIFETIME_MS = 1000 * 60 * 60 * 8;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const QA_BYPASS_ENABLED = process.env.QA_BYPASS_ENABLED === "true";
const QA_BYPASS_USERS = {
    host: {
        uid: "4GsKVrhVBaakDpWkX0cgY5lfUxM2",
        email: "qa-host-roomcast@example.com",
        displayName: "qa-host-roomcast",
    },
    guest: {
        uid: "xG0clBJrhNhpZQC7vMWyev1yCen2",
        email: "qa-guest-roomcast@example.com",
        displayName: "qa-guest-roomcast",
    },
};
function requireUid(uid) {
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Sign in to continue.");
    return uid;
}
function makeRoomCode() {
    let code = "";
    for (let i = 0; i < 6; i += 1) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
}
function authProfile(request) {
    const uid = request.auth?.uid;
    const token = request.auth?.token;
    const qaRole = token?.qaRole;
    const qaUser = (qaRole === "host" || qaRole === "guest") ? QA_BYPASS_USERS[qaRole] : null;
    const displayName = qaUser?.displayName ||
        (typeof token?.name === "string" && token.name.trim()) ||
        (typeof token?.email === "string" && token.email.split("@")[0]) ||
        "RoomCast Guest";
    return {
        displayName,
        email: qaUser?.email || (typeof token?.email === "string" ? token.email : null),
        photoURL: typeof token?.picture === "string" ? token.picture : null,
        joinedAt: firestore_1.FieldValue.serverTimestamp(),
        role: uid ? "host" : "guest",
    };
}
async function markRoomEnded(roomRef, room) {
    const activeSessionId = typeof room.activeSessionId === "string" ? room.activeSessionId : null;
    const update = {
        status: "ended",
        sharingStatus: "stopped",
        activeSessionId: null,
        reconnectRequest: null,
        endedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await roomRef.update(update);
    if (activeSessionId) {
        await roomRef.collection("sessions").doc(activeSessionId).set({
            status: "stopped",
            stoppedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
}
async function uniqueRoomCode() {
    for (let i = 0; i < 8; i += 1) {
        const roomCode = makeRoomCode();
        const existing = await db.collection("rooms").where("roomCode", "==", roomCode).limit(1).get();
        if (existing.empty)
            return roomCode;
    }
    throw new https_1.HttpsError("resource-exhausted", "Could not allocate a room code. Try again.");
}
async function resolveRoom(roomIdOrCode) {
    const input = roomIdOrCode.trim();
    if (!input)
        throw new https_1.HttpsError("invalid-argument", "Room id or code is required.");
    const direct = await db.collection("rooms").doc(input).get();
    if (direct.exists)
        return direct;
    const byCode = await db.collection("rooms").where("roomCode", "==", input.toUpperCase()).limit(1).get();
    if (!byCode.empty)
        return byCode.docs[0];
    throw new https_1.HttpsError("not-found", "Room not found.");
}
exports.createRoom = (0, https_1.onCall)(async (request) => {
    const uid = requireUid(request.auth?.uid);
    const hostProfile = { ...authProfile(request), role: "host" };
    const name = typeof request.data?.name === "string" && request.data.name.trim()
        ? request.data.name.trim().slice(0, 80)
        : "Untitled room";
    const roomRef = db.collection("rooms").doc();
    const roomCode = await uniqueRoomCode();
    const expiresAt = firestore_1.Timestamp.fromMillis(Date.now() + ROOM_LIFETIME_MS);
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
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAt,
    });
    return { roomId: roomRef.id, roomCode };
});
exports.getQaBypassToken = (0, https_1.onCall)(async (request) => {
    if (!QA_BYPASS_ENABLED) {
        throw new https_1.HttpsError("permission-denied", "QA bypass is disabled.");
    }
    const role = request.data?.role;
    if (role !== "host" && role !== "guest") {
        throw new https_1.HttpsError("invalid-argument", "role must be either host or guest.");
    }
    const qaUser = QA_BYPASS_USERS[role];
    await adminAuth.getUser(qaUser.uid).catch(() => {
        throw new https_1.HttpsError("failed-precondition", `QA ${role} user is not provisioned in Firebase Auth.`);
    });
    const token = await adminAuth.createCustomToken(qaUser.uid, {
        qaBypass: true,
        qaRole: role,
    });
    return { token };
});
exports.joinRoom = (0, https_1.onCall)(async (request) => {
    const uid = requireUid(request.auth?.uid);
    const guestProfile = { ...authProfile(request), role: "guest" };
    const roomIdOrCode = String(request.data?.roomIdOrCode || "");
    const roomSnap = await resolveRoom(roomIdOrCode);
    const roomRef = roomSnap.ref;
    await db.runTransaction(async (tx) => {
        const fresh = await tx.get(roomRef);
        if (!fresh.exists)
            throw new https_1.HttpsError("not-found", "Room not found.");
        const room = fresh.data() || {};
        if (room.status === "ended")
            throw new https_1.HttpsError("failed-precondition", "This room has ended.");
        if (room.hostUid === uid)
            return;
        if (room.guestUid && room.guestUid !== uid) {
            throw new https_1.HttpsError("resource-exhausted", "This MVP room already has one host and one guest.");
        }
        tx.update(roomRef, {
            guestUid: uid,
            [`participants.${uid}`]: true,
            [`participantProfiles.${uid}`]: guestProfile,
            status: "connected",
            reconnectRequest: null,
            startedAt: room.startedAt || firestore_1.FieldValue.serverTimestamp(),
        });
    });
    const updated = await roomRef.get();
    return { roomId: updated.id, roomCode: updated.data()?.roomCode };
});
exports.endRoom = (0, https_1.onCall)(async (request) => {
    const uid = requireUid(request.auth?.uid);
    const roomId = String(request.data?.roomId || "");
    if (!roomId)
        throw new https_1.HttpsError("invalid-argument", "roomId is required.");
    const roomRef = db.collection("rooms").doc(roomId);
    const snap = await roomRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Room not found.");
    const room = snap.data() || {};
    if (room.hostUid !== uid)
        throw new https_1.HttpsError("permission-denied", "Only the host can end this room.");
    await markRoomEnded(roomRef, room);
    return { ok: true };
});
exports.startRoomSession = (0, https_1.onCall)(async (request) => {
    const uid = requireUid(request.auth?.uid);
    const roomId = String(request.data?.roomId || "");
    if (!roomId)
        throw new https_1.HttpsError("invalid-argument", "roomId is required.");
    const roomRef = db.collection("rooms").doc(roomId);
    const sessionRef = roomRef.collection("sessions").doc();
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists)
            throw new https_1.HttpsError("not-found", "Room not found.");
        const room = snap.data() || {};
        if (room.hostUid !== uid)
            throw new https_1.HttpsError("permission-denied", "Only the host can start sharing.");
        if (room.status === "ended")
            throw new https_1.HttpsError("failed-precondition", "This room has ended.");
        const previousSessionId = typeof room.activeSessionId === "string" ? room.activeSessionId : null;
        if (previousSessionId) {
            tx.set(roomRef.collection("sessions").doc(previousSessionId), {
                status: "stopped",
                stoppedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        tx.set(sessionRef, {
            sessionId: sessionRef.id,
            status: "starting",
            offer: null,
            answer: null,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            hostUid: uid,
            guestUid: room.guestUid || null,
        });
        tx.update(roomRef, {
            activeSessionId: sessionRef.id,
            sharingStatus: "sharing",
            reconnectRequest: null,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    return { sessionId: sessionRef.id };
});
exports.stopRoomSession = (0, https_1.onCall)(async (request) => {
    const uid = requireUid(request.auth?.uid);
    const roomId = String(request.data?.roomId || "");
    if (!roomId)
        throw new https_1.HttpsError("invalid-argument", "roomId is required.");
    const roomRef = db.collection("rooms").doc(roomId);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists)
            throw new https_1.HttpsError("not-found", "Room not found.");
        const room = snap.data() || {};
        if (room.hostUid !== uid)
            throw new https_1.HttpsError("permission-denied", "Only the host can stop sharing.");
        const activeSessionId = typeof room.activeSessionId === "string" ? room.activeSessionId : null;
        tx.update(roomRef, {
            activeSessionId: null,
            sharingStatus: "stopped",
            reconnectRequest: null,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        if (activeSessionId) {
            tx.set(roomRef.collection("sessions").doc(activeSessionId), {
                status: "stopped",
                stoppedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
    });
    return { ok: true };
});
exports.requestReconnect = (0, https_1.onCall)(async (request) => {
    const uid = requireUid(request.auth?.uid);
    const roomId = String(request.data?.roomId || "");
    const sessionId = String(request.data?.sessionId || "");
    if (!roomId || !sessionId)
        throw new https_1.HttpsError("invalid-argument", "roomId and sessionId are required.");
    const roomRef = db.collection("rooms").doc(roomId);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists)
            throw new https_1.HttpsError("not-found", "Room not found.");
        const room = snap.data() || {};
        if (room.guestUid !== uid)
            throw new https_1.HttpsError("permission-denied", "Only the guest can request reconnect.");
        if (room.status === "ended")
            throw new https_1.HttpsError("failed-precondition", "This room has ended.");
        if (room.activeSessionId !== sessionId)
            return;
        tx.update(roomRef, {
            sharingStatus: "reconnecting",
            reconnectRequest: {
                requestedByUid: uid,
                requestedAt: firestore_1.FieldValue.serverTimestamp(),
                sessionId,
            },
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    return { ok: true };
});
exports.leaveRoom = (0, https_1.onCall)(async (request) => {
    const uid = requireUid(request.auth?.uid);
    const roomId = String(request.data?.roomId || "");
    if (!roomId)
        throw new https_1.HttpsError("invalid-argument", "roomId is required.");
    const roomRef = db.collection("rooms").doc(roomId);
    const snap = await roomRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Room not found.");
    const room = snap.data() || {};
    if (room.hostUid === uid) {
        await markRoomEnded(roomRef, room);
        return { ok: true, ended: true };
    }
    if (room.guestUid !== uid) {
        throw new https_1.HttpsError("permission-denied", "Only room participants can leave this room.");
    }
    const activeSessionId = typeof room.activeSessionId === "string" ? room.activeSessionId : null;
    const update = {
        guestUid: null,
        status: "waiting",
        sharingStatus: "stopped",
        activeSessionId: null,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        [`participants.${uid}`]: firestore_1.FieldValue.delete(),
        [`participantProfiles.${uid}`]: firestore_1.FieldValue.delete(),
    };
    if (room.reconnectRequest?.requestedByUid === uid) {
        update.reconnectRequest = null;
    }
    await roomRef.update(update);
    if (activeSessionId) {
        await roomRef.collection("sessions").doc(activeSessionId).set({
            status: "stopped",
            stoppedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    return { ok: true, ended: false };
});
exports.cleanupExpiredRooms = (0, scheduler_1.onSchedule)("every 24 hours", async () => {
    const expired = await db.collection("rooms").where("expiresAt", "<=", firestore_1.Timestamp.now()).limit(100).get();
    await Promise.all(expired.docs.map((roomDoc) => db.recursiveDelete(roomDoc.ref)));
});
//# sourceMappingURL=index.js.map