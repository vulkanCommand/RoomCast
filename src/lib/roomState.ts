import type { Room, SharingStatus } from "@/types";

type RoomLike = Pick<Room, "status" | "activeSessionId" | "sharingStatus" | "hostId" | "reconnectRequest">;

export type DerivedConnectionStatus =
  | "waiting"
  | "connected"
  | "reconnecting"
  | "ended";

export function isRoomSharing(room: Pick<Room, "activeSessionId" | "sharingStatus">) {
  return Boolean(room.activeSessionId && room.sharingStatus === "sharing");
}

export function deriveConnectionStatus(room: Pick<Room, "status" | "activeSessionId" | "sharingStatus" | "reconnectRequest">): DerivedConnectionStatus {
  if (room.status === "ended") return "ended";
  if (room.reconnectRequest || room.sharingStatus === "reconnecting") return "reconnecting";
  if (room.activeSessionId && room.sharingStatus === "sharing") return "connected";
  return "waiting";
}

export function isParticipantSharing(room: RoomLike, participantId: string) {
  return participantId === room.hostId && isRoomSharing(room);
}

export function normalizeSharingStatus(status: SharingStatus | undefined): SharingStatus {
  return status || "stopped";
}
