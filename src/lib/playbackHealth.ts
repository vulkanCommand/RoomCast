import type { SharingStatus } from "@/types";

export type GuestPlaybackState = "idle" | "joining" | "ready" | "stalled";

type StageStateInput = {
  isViewingOwnShare: boolean;
  hasVideoTrack: boolean;
  hasSharer: boolean;
  activeSessionId: string | null;
  guestPlaybackState: GuestPlaybackState;
};

type ConnectionStatusInput = {
  isViewingOwnShare: boolean;
  activeSessionId: string | null;
  roomConnectionStatus: "idle" | "waiting" | "connecting" | "connected" | "reconnecting" | "ended" | "error";
  guestPlaybackState: GuestPlaybackState;
  playbackBlocked: boolean;
};

type ReconnectInput = {
  currentRole: "host" | "guest" | null;
  activeSessionId: string | null;
  sharingStatus?: SharingStatus;
  guestPlaybackState: GuestPlaybackState;
  playbackBlocked: boolean;
  connectionState: RTCPeerConnectionState | "unknown";
  iceConnectionState: RTCIceConnectionState | "unknown";
  sessionAgeMs: number;
  requestedByUid?: string | null;
  requestSessionId?: string | null;
  userId: string;
};

export function deriveRoomStageState(input: StageStateInput) {
  if (input.isViewingOwnShare && input.hasVideoTrack) return "video";
  if (!input.isViewingOwnShare && input.hasVideoTrack && input.guestPlaybackState === "ready") return "video";
  if (input.activeSessionId && input.hasSharer) return "connecting";
  return "empty";
}

export function deriveGuestDisplayConnectionStatus(input: ConnectionStatusInput) {
  if (
    !input.isViewingOwnShare &&
    input.activeSessionId &&
    input.guestPlaybackState !== "ready" &&
    !input.playbackBlocked
  ) {
    return "reconnecting";
  }

  return input.roomConnectionStatus;
}

export function shouldRequestPlaybackReconnect(input: ReconnectInput) {
  if (input.currentRole !== "guest") return false;
  if (!input.activeSessionId) return false;
  if (input.sharingStatus !== "sharing") return false;
  if (input.playbackBlocked) return false;
  if (input.guestPlaybackState === "ready") return false;
  if (input.requestedByUid === input.userId && input.requestSessionId === input.activeSessionId) return false;
  if (input.connectionState === "failed" || input.iceConnectionState === "failed") return true;
  if (input.connectionState === "disconnected" || input.iceConnectionState === "disconnected") return input.sessionAgeMs >= 3000;
  if (input.sessionAgeMs < 12000) return false;
  return true;
}
