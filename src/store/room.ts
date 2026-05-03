import { create } from "zustand";
import type { ChatMessage, Participant, Room, User } from "@/types";
import { hueFromString, initialsFrom, makeId, makeRoomCode } from "@/lib/roomcast";

interface RoomState {
  room: Room | null;
  participants: Participant[];
  messages: ChatMessage[];
  sharingUserId: string | null;
  // actions
  createRoom: (host: User, name: string) => Room;
  joinRoomByCode: (code: string, user: User) => Room | null;
  joinRoom: (room: Room, user: User) => void;
  leaveRoom: (userId: string) => void;
  endRoom: () => void;
  startSharing: (userId: string) => void;
  stopSharing: () => void;
  setSpeaking: (userId: string, speaking: boolean) => void;
  setMuted: (userId: string, muted: boolean) => void;
  sendMessage: (user: User, text: string) => void;
  addSystemMessage: (text: string) => void;
  reset: () => void;
}

const seedParticipants = (host: User): Participant[] => [
  {
    id: host.id,
    displayName: host.displayName,
    initials: host.initials,
    avatarColor: host.avatarColor,
    role: "host",
    isSharing: false,
    isSpeaking: false,
    isMuted: false,
    joinedAt: Date.now(),
  },
];

const demoNames = ["Ava Chen", "Marcus Lee", "Priya Singh", "Diego Alvarez"];

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  participants: [],
  messages: [],
  sharingUserId: null,

  createRoom: (host, name) => {
    const room: Room = {
      id: makeId("room"),
      code: makeRoomCode(),
      name: name || "Untitled Room",
      hostId: host.id,
      status: "lobby",
      createdAt: Date.now(),
      maxParticipants: 12,
    };
    // add a couple of demo guests for cinematic feel
    const guests: Participant[] = demoNames.slice(0, 2).map((n) => ({
      id: makeId("usr"),
      displayName: n,
      initials: initialsFrom(n),
      avatarColor: hueFromString(n),
      role: "guest",
      isSharing: false,
      isSpeaking: false,
      isMuted: true,
      joinedAt: Date.now(),
    }));
    set({
      room,
      participants: [...seedParticipants(host), ...guests],
      messages: [
        {
          id: makeId("msg"),
          roomId: room.id,
          userId: "system",
          displayName: "RoomCast",
          initials: "RC",
          avatarColor: "265",
          text: `Room "${room.name}" created. Share code ${room.code} to invite.`,
          createdAt: Date.now(),
          system: true,
        },
      ],
      sharingUserId: null,
    });
    return room;
  },

  joinRoomByCode: (code, user) => {
    const upper = code.trim().toUpperCase();
    let room = get().room;
    if (!room || room.code !== upper) {
      // mock: create a synthetic room with a fake host
      const fakeHost: Participant = {
        id: makeId("usr"),
        displayName: "Ava Chen",
        initials: "AC",
        avatarColor: hueFromString("Ava Chen"),
        role: "host",
        isSharing: true,
        isSpeaking: false,
        isMuted: false,
        joinedAt: Date.now() - 60_000,
      };
      room = {
        id: makeId("room"),
        code: upper,
        name: "Movie Night",
        hostId: fakeHost.id,
        status: "live",
        createdAt: Date.now() - 60_000,
        startedAt: Date.now() - 30_000,
        maxParticipants: 12,
      };
      const others: Participant[] = ["Marcus Lee", "Priya Singh"].map((n) => ({
        id: makeId("usr"),
        displayName: n,
        initials: initialsFrom(n),
        avatarColor: hueFromString(n),
        role: "guest",
        isSharing: false,
        isSpeaking: false,
        isMuted: true,
        joinedAt: Date.now() - 20_000,
      }));
      set({
        room,
        participants: [fakeHost, ...others],
        sharingUserId: fakeHost.id,
        messages: [
          {
            id: makeId("msg"),
            roomId: room.id,
            userId: "system",
            displayName: "RoomCast",
            initials: "RC",
            avatarColor: "265",
            text: `You joined ${room.name}.`,
            createdAt: Date.now(),
            system: true,
          },
        ],
      });
    }
    get().joinRoom(room, user);
    return room;
  },

  joinRoom: (room, user) => {
    set((s) => {
      if (s.participants.some((p) => p.id === user.id)) return s;
      const me: Participant = {
        id: user.id,
        displayName: user.displayName,
        initials: user.initials,
        avatarColor: user.avatarColor,
        role: room.hostId === user.id ? "host" : "guest",
        isSharing: false,
        isSpeaking: false,
        isMuted: true,
        joinedAt: Date.now(),
      };
      return {
        room,
        participants: [...s.participants, me],
        messages: [
          ...s.messages,
          {
            id: makeId("msg"),
            roomId: room.id,
            userId: "system",
            displayName: "RoomCast",
            initials: "RC",
            avatarColor: "265",
            text: `${user.displayName} joined the room.`,
            createdAt: Date.now(),
            system: true,
          },
        ],
      };
    });
  },

  leaveRoom: (userId) =>
    set((s) => ({
      participants: s.participants.filter((p) => p.id !== userId),
      sharingUserId: s.sharingUserId === userId ? null : s.sharingUserId,
    })),

  endRoom: () =>
    set((s) =>
      s.room
        ? { room: { ...s.room, status: "ended", endedAt: Date.now() }, sharingUserId: null }
        : s,
    ),

  startSharing: (userId) =>
    set((s) => ({
      sharingUserId: userId,
      room: s.room ? { ...s.room, status: "live", startedAt: s.room.startedAt ?? Date.now() } : s.room,
      participants: s.participants.map((p) => ({ ...p, isSharing: p.id === userId })),
    })),

  stopSharing: () =>
    set((s) => ({
      sharingUserId: null,
      participants: s.participants.map((p) => ({ ...p, isSharing: false })),
    })),

  setSpeaking: (userId, speaking) =>
    set((s) => ({
      participants: s.participants.map((p) => (p.id === userId ? { ...p, isSpeaking: speaking } : p)),
    })),

  setMuted: (userId, muted) =>
    set((s) => ({
      participants: s.participants.map((p) => (p.id === userId ? { ...p, isMuted: muted } : p)),
    })),

  sendMessage: (user, text) => {
    const t = text.trim();
    if (!t) return;
    set((s) => {
      if (!s.room) return s;
      return {
        messages: [
          ...s.messages,
          {
            id: makeId("msg"),
            roomId: s.room.id,
            userId: user.id,
            displayName: user.displayName,
            initials: user.initials,
            avatarColor: user.avatarColor,
            text: t,
            createdAt: Date.now(),
          },
        ],
      };
    });
  },

  addSystemMessage: (text) =>
    set((s) => {
      if (!s.room) return s;
      return {
        messages: [
          ...s.messages,
          {
            id: makeId("msg"),
            roomId: s.room.id,
            userId: "system",
            displayName: "RoomCast",
            initials: "RC",
            avatarColor: "265",
            text,
            createdAt: Date.now(),
            system: true,
          },
        ],
      };
    }),

  reset: () => set({ room: null, participants: [], messages: [], sharingUserId: null }),
}));
