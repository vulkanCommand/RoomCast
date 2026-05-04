"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredRooms = exports.endRoom = exports.joinRoom = exports.createRoom = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const ROOM_LIFETIME_MS = 1000 * 60 * 60 * 8;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
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
    const displayName = (typeof token?.name === "string" && token.name.trim()) ||
        (typeof token?.email === "string" && token.email.split("@")[0]) ||
        "RoomCast Guest";
    return {
        displayName,
        email: typeof token?.email === "string" ? token.email : null,
        photoURL: typeof token?.picture === "string" ? token.picture : null,
        joinedAt: firestore_1.FieldValue.serverTimestamp(),
        role: uid ? "host" : "guest",
    };
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
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAt,
        offer: null,
        answer: null,
    });
    return { roomId: roomRef.id, roomCode };
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
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists)
            throw new https_1.HttpsError("not-found", "Room not found.");
        const room = snap.data() || {};
        if (room.hostUid !== uid)
            throw new https_1.HttpsError("permission-denied", "Only the host can end this room.");
        tx.update(roomRef, {
            status: "ended",
            endedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    return { ok: true };
});
exports.cleanupExpiredRooms = (0, scheduler_1.onSchedule)("every 24 hours", async () => {
    const expired = await db.collection("rooms").where("expiresAt", "<=", firestore_1.Timestamp.now()).limit(100).get();
    const batch = db.batch();
    expired.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
});
//# sourceMappingURL=index.js.map