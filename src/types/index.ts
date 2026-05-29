export type UserId = string;

export interface User {
  id: UserId;
  displayName: string;
  email?: string;
  photoURL?: string;
  avatarColor: string; // HSL hue base for generated avatar
  initials: string;
}

export type ParticipantRole = "host" | "guest";

export interface Participant {
  id: UserId;
  displayName: string;
  initials: string;
  avatarColor: string;
  role: ParticipantRole;
  isSharing: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  joinedAt: number;
}

export type RoomStatus = "waiting" | "connected" | "ended";
export type SharingStatus = "stopped" | "sharing" | "reconnecting";

export interface ReconnectRequest {
  requestedByUid: UserId;
  requestedAt: number;
  sessionId: string;
}

export interface Room {
  id: string;
  code: string; // 6-char invite code
  name: string;
  hostId: UserId;
  guestId?: UserId | null;
  status: RoomStatus;
  createdAt: number;
  expiresAt?: number;
  startedAt?: number;
  endedAt?: number;
  maxParticipants: number;
  activeSessionId?: string | null;
  sharingStatus?: SharingStatus;
  reconnectRequest?: ReconnectRequest | null;
}
