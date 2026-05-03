import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { makeUser } from "@/lib/roomcast";

interface AuthState {
  user: User | null;
  isAuthed: boolean;
  signIn: (displayName: string, email?: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthed: false,
      signIn: (displayName, email) => {
        const user = makeUser(displayName || "Guest", email);
        set({ user, isAuthed: true });
      },
      signOut: () => set({ user: null, isAuthed: false }),
    }),
    { name: "roomcast.auth" },
  ),
);
