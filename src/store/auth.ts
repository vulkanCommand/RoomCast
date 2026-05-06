import { create } from "zustand";
import type { User } from "@/types";
import { hueFromString, initialsFrom } from "@/lib/roomcast";
import * as authService from "@/services/authService";
import { firebaseConfigError, isFirebaseConfigured } from "@/services/firebase";
import type { User as FirebaseUser } from "firebase/auth";

interface AuthState {
  user: User | null;
  isAuthed: boolean;
  isLoading: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  listenToAuthState: () => () => void;
}

function mapFirebaseUser(firebaseUser: FirebaseUser): User {
  const displayName = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "RoomCast Guest";
  return {
    id: firebaseUser.uid,
    displayName,
    email: firebaseUser.email || undefined,
    photoURL: firebaseUser.photoURL || undefined,
    initials: initialsFrom(displayName),
    avatarColor: hueFromString(firebaseUser.uid),
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthed: false,
  isLoading: true,
  error: null,

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.signInWithGoogle();
      set({ user: mapFirebaseUser(result.user), isAuthed: true, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sign in with Google.";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  loginWithEmailPassword: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.signInWithEmailPassword(email, password);
      set({ user: mapFirebaseUser(result.user), isAuthed: true, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sign in with email and password.";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthed: false, isLoading: false, error: null });
  },

  listenToAuthState: () => {
    if (!isFirebaseConfigured) {
      set({
        user: null,
        isAuthed: false,
        isLoading: false,
        error: firebaseConfigError,
      });
      return () => undefined;
    }
    set({ isLoading: true });
    return authService.listenToAuthState((firebaseUser) => {
      set({
        user: firebaseUser ? mapFirebaseUser(firebaseUser) : null,
        isAuthed: Boolean(firebaseUser),
        isLoading: false,
        error: null,
      });
    });
  },
}));
