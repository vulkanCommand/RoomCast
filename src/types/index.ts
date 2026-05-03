export type UserId = string;

export interface User {
  id: UserId;
  displayName: string;
  email?: string;
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

export type RoomStatus = "lobby" | "live" | "ended";

export interface Room {
  id: string;
  code: string; // 6-char invite code
  name: string;
  hostId: UserId;
  status: RoomStatus;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  maxParticipants: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: UserId;
  displayName: string;
  initials: string;
  avatarColor: string;
  text: string;
  createdAt: number;
  system?: boolean;
}
