import { create } from "zustand";
import type { Participant, Room, User } from "@/types";
import { hueFromString, initialsFrom } from "@/lib/roomcast";
import { deriveConnectionStatus, isParticipantSharing, isRoomSharing } from "@/lib/roomState";
import * as roomService from "@/services/roomService";
import * as webrtcService from "@/services/webrtcService";
import type { Unsubscribe } from "firebase/firestore";
import type { RoomSnapshot } from "@/services/roomService";

interface RoomState {
  room: Room | null;
  participants: Participant[];
  currentRole: "host" | "guest" | null;
  connectionStatus: "idle" | "waiting" | "connecting" | "connected" | "reconnecting" | "ended" | "error";
  sharingUserId: string | null;
  activeSessionId: string | null;
  roomCode: string | null;
  error: string | null;
  // actions
  createRoom: (host: User, name: string) => Promise<Room>;
  joinRoomByCode: (code: string, user: User) => Promise<Room | null>;
  joinRoom: (roomIdOrCode: string, user: User) => Promise<Room | null>;
  subscribeToRoom: (roomId: string, currentUser: User) => Unsubscribe;
  leaveRoom: (userId: string) => Promise<{ ended?: boolean } | void>;
  endRoom: () => Promise<void>;
  startSharing: (userId: string, options?: { reuseScreen?: boolean }) => Promise<{ micWarning?: string } | void>;
  stopSharing: () => Promise<void>;
  setSpeaking: (userId: string, speaking: boolean) => void;
  setMuted: (userId: string, muted: boolean) => void;
  reset: () => void;
}

function participantFor(id: string, role: "host" | "guest", currentUser: User, room: RoomSnapshot | Room): Participant {
  const isMe = id === currentUser.id;
  const profile = "participantProfiles" in room ? room.participantProfiles?.[id] : undefined;
  const fallbackName = role === "host" ? "Host" : "Guest";
  const displayName = isMe ? currentUser.displayName : profile?.displayName || fallbackName;
  return {
    id,
    displayName,
    initials: initialsFrom(displayName),
    avatarColor: isMe ? currentUser.avatarColor : hueFromString(id),
    role,
    isSharing: isParticipantSharing(room, id),
    isSpeaking: false,
    isMuted: !isMe,
    joinedAt: Date.now(),
  };
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  participants: [],
  currentRole: null,
  connectionStatus: "idle",
  sharingUserId: null,
  activeSessionId: null,
  roomCode: null,
  error: null,

  createRoom: async (host, name) => {
    set({ connectionStatus: "connecting", error: null });
    const created = await roomService.createRoom(name);
    const room: Room = {
      id: created.roomId,
      code: created.roomCode,
      name,
      hostId: host.id,
      guestId: null,
      status: "waiting",
      createdAt: Date.now(),
      maxParticipants: 2,
    };
    set({
      room,
      participants: [participantFor(host.id, "host", host, room)],
      currentRole: "host",
      connectionStatus: "waiting",
      sharingUserId: null,
      activeSessionId: null,
      roomCode: created.roomCode,
    });
    return room;
  },

  joinRoomByCode: (code, user) => get().joinRoom(code, user),

  joinRoom: async (roomIdOrCode, user) => {
    set({ connectionStatus: "connecting", error: null });
    try {
      const joined = await roomService.joinRoom(roomIdOrCode);
      const room: Room = {
        id: joined.roomId,
        code: joined.roomCode,
        name: "RoomCast room",
        hostId: "",
        status: "connected",
        createdAt: Date.now(),
        maxParticipants: 2,
      };
      set({ room, roomCode: joined.roomCode, connectionStatus: "connected" });
      return room;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not join room.";
      set({ error: message, connectionStatus: "error" });
      throw error;
    }
  },

  subscribeToRoom: (roomId, currentUser) =>
    roomService.subscribeToRoom(roomId, (snapshot) => {
      if (!snapshot) {
        set({ room: null, participants: [], connectionStatus: "ended", error: "Room not found." });
        return;
      }
      const ids = Object.keys(snapshot.participantsMap || {});
      const participants = ids
        .map((id) => {
          if (id === snapshot.hostId) return participantFor(id, "host", currentUser, snapshot);
          if (id === snapshot.guestId) return participantFor(id, "guest", currentUser, snapshot);
          return null;
        })
        .filter(Boolean) as Participant[];
      const currentRole = snapshot.hostId === currentUser.id ? "host" : snapshot.guestId === currentUser.id ? "guest" : null;
      set((state) => ({
        room: snapshot,
        participants: participants.map((next) => {
          const previous = state.participants.find((p) => p.id === next.id);
          return previous ? { ...next, isSpeaking: previous.isSpeaking, isMuted: previous.isMuted } : next;
        }),
        currentRole,
        connectionStatus: deriveConnectionStatus(snapshot),
        sharingUserId: isRoomSharing(snapshot) && snapshot.status !== "ended" ? snapshot.hostId : null,
        activeSessionId: snapshot.activeSessionId || null,
        roomCode: snapshot.code,
      }));
    }),

  leaveRoom: async (userId) => {
    const roomId = get().room?.id;
    if (!roomId) return;
    const result = await roomService.leaveRoom(roomId);
    webrtcService.cleanupConnection();
    set((s) => ({
      room: result.ended && s.room ? { ...s.room, status: "ended", endedAt: Date.now() } : s.room,
      participants: s.participants.filter((p) => p.id !== userId),
      sharingUserId: null,
      activeSessionId: null,
      connectionStatus: result.ended ? "ended" : "waiting",
    }));
    return result;
  },

  endRoom: async () => {
    const roomId = get().room?.id;
    if (roomId) await roomService.endRoom(roomId);
    webrtcService.cleanupConnection();
    set((s) =>
      s.room
        ? { room: { ...s.room, status: "ended", endedAt: Date.now() }, sharingUserId: null, activeSessionId: null }
        : s,
    );
  },

  startSharing: async (userId, options) => {
    const roomId = get().room?.id;
    if (!roomId) return;
    const { sessionId, micWarning } = await webrtcService.startHostSession(roomId, options);
    set((s) => ({
      sharingUserId: userId,
      activeSessionId: sessionId,
      room: s.room
        ? {
            ...s.room,
            status: "connected",
            startedAt: s.room.startedAt ?? Date.now(),
            activeSessionId: sessionId,
            sharingStatus: "sharing",
            reconnectRequest: null,
          }
        : s.room,
      participants: s.participants.map((p) => ({ ...p, isSharing: p.id === userId })),
    }));
    return { micWarning };
  },

  stopSharing: async () => {
    const roomId = get().room?.id;
    if (!roomId) return;
    await webrtcService.stopSharingSession(roomId);
    set((s) => ({
      sharingUserId: null,
      activeSessionId: null,
      room: s.room ? { ...s.room, activeSessionId: null, sharingStatus: "stopped", reconnectRequest: null } : s.room,
      participants: s.participants.map((p) => ({ ...p, isSharing: false })),
    }));
  },

  setSpeaking: (userId, speaking) =>
    set((s) => ({
      participants: s.participants.map((p) => (p.id === userId ? { ...p, isSpeaking: speaking } : p)),
    })),

  setMuted: (userId, muted) =>
    set((s) => ({
      participants: s.participants.map((p) => (p.id === userId ? { ...p, isMuted: muted } : p)),
    })),

  reset: () => {
    webrtcService.cleanupConnection();
    set({
      room: null,
      participants: [],
      currentRole: null,
      connectionStatus: "idle",
      sharingUserId: null,
      activeSessionId: null,
      roomCode: null,
      error: null,
    });
  },
}));
