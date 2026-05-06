import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot, type DocumentData } from "firebase/firestore";
import { getFirestoreInstance, getFunctionsInstance } from "@/services/firebase";
import type { Room, SharingStatus } from "@/types";

export interface RoomSnapshot extends Room {
  participantsMap: Record<string, boolean>;
  participantProfiles: Record<string, { displayName?: string; email?: string | null; photoURL?: string | null }>;
}

export interface RoomSessionSnapshot {
  id: string;
  offer?: RTCSessionDescriptionInit | null;
  answer?: RTCSessionDescriptionInit | null;
  createdAt: number;
  status: "starting" | "active" | "stopped";
}

function toMillis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (typeof value === "number") return value;
  return Date.now();
}

export function mapRoomDoc(data: DocumentData, id: string): RoomSnapshot {
  return {
    id,
    code: data.roomCode,
    name: data.name || "Untitled room",
    hostId: data.hostUid,
    guestId: data.guestUid || null,
    status: data.status,
    createdAt: toMillis(data.createdAt),
    expiresAt: toMillis(data.expiresAt),
    startedAt: data.status === "connected" ? toMillis(data.startedAt || data.createdAt) : undefined,
    endedAt: data.status === "ended" ? toMillis(data.endedAt) : undefined,
    maxParticipants: 2,
    participantsMap: data.participants || {},
    participantProfiles: data.participantProfiles || {},
    activeSessionId: data.activeSessionId || null,
    sharingStatus: (data.sharingStatus as SharingStatus | undefined) || "stopped",
  };
}

function mapSessionDoc(data: DocumentData, id: string): RoomSessionSnapshot {
  return {
    id,
    offer: data.offer || null,
    answer: data.answer || null,
    createdAt: toMillis(data.createdAt),
    status: data.status || "starting",
  };
}

export async function createRoom(name?: string) {
  const fn = httpsCallable<{ name?: string }, { roomId: string; roomCode: string }>(getFunctionsInstance(), "createRoom");
  return (await fn({ name })).data;
}

export async function joinRoom(roomIdOrCode: string) {
  const fn = httpsCallable<{ roomIdOrCode: string }, { roomId: string; roomCode: string }>(getFunctionsInstance(), "joinRoom");
  return (await fn({ roomIdOrCode })).data;
}

export async function endRoom(roomId: string) {
  const fn = httpsCallable<{ roomId: string }, { ok: boolean }>(getFunctionsInstance(), "endRoom");
  return (await fn({ roomId })).data;
}

export async function startRoomSession(roomId: string) {
  const fn = httpsCallable<{ roomId: string }, { sessionId: string }>(getFunctionsInstance(), "startRoomSession");
  return (await fn({ roomId })).data;
}

export async function stopRoomSession(roomId: string) {
  const fn = httpsCallable<{ roomId: string }, { ok: boolean }>(getFunctionsInstance(), "stopRoomSession");
  return (await fn({ roomId })).data;
}

export function subscribeToRoom(roomId: string, callback: (room: RoomSnapshot | null) => void) {
  return onSnapshot(doc(getFirestoreInstance(), "rooms", roomId), (snapshot) => {
    callback(snapshot.exists() ? mapRoomDoc(snapshot.data(), snapshot.id) : null);
  });
}

export function subscribeToSession(
  roomId: string,
  sessionId: string,
  callback: (session: RoomSessionSnapshot | null) => void,
) {
  return onSnapshot(doc(getFirestoreInstance(), "rooms", roomId, "sessions", sessionId), (snapshot) => {
    callback(snapshot.exists() ? mapSessionDoc(snapshot.data(), snapshot.id) : null);
  });
}
