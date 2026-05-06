import { create } from "zustand";
import * as webrtcService from "@/services/webrtcService";
import { computeActualMicEnabled, type MicMode } from "@/lib/voice";

interface VoiceState {
  hasMicPermission: boolean;
  micMode: MicMode;
  pushToTalkActive: boolean;
  actualMicEnabled: boolean;
  isTalking: boolean;
  shareVolume: number;
  speakingUserIds: string[];
  setMicPermission: (v: boolean) => void;
  setMicMode: (mode: MicMode) => void;
  startTalking: () => void;
  stopTalking: () => void;
  setShareVolume: (v: number) => void;
  setSpeakingUsers: (ids: string[]) => void;
  reset: () => void;
}

function syncMicState(
  set: (partial: Partial<VoiceState>) => void,
  next: Pick<VoiceState, "micMode" | "pushToTalkActive" | "hasMicPermission" | "shareVolume" | "speakingUserIds">,
) {
  const actualMicEnabled = next.hasMicPermission && computeActualMicEnabled(next.micMode, next.pushToTalkActive);
  webrtcService.setMicEnabled(actualMicEnabled);
  set({
    ...next,
    actualMicEnabled,
    isTalking: next.micMode === "push-to-talk" && next.pushToTalkActive,
  });
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  hasMicPermission: false,
  micMode: "push-to-talk",
  pushToTalkActive: false,
  actualMicEnabled: false,
  isTalking: false,
  shareVolume: 1,
  speakingUserIds: [],

  setMicPermission: (v) => {
    const state = get();
    syncMicState(set, { ...state, hasMicPermission: v });
  },

  setMicMode: (mode) => {
    const state = get();
    const pushToTalkActive = mode === "always-on" ? false : state.pushToTalkActive;
    syncMicState(set, { ...state, micMode: mode, pushToTalkActive });
  },

  startTalking: () => {
    const state = get();
    if (state.micMode === "always-on") return;
    webrtcService.sendSpeaking(true);
    syncMicState(set, { ...state, pushToTalkActive: true });
  },

  stopTalking: () => {
    const state = get();
    if (state.micMode === "always-on") return;
    webrtcService.sendSpeaking(false);
    syncMicState(set, { ...state, pushToTalkActive: false });
  },

  setShareVolume: (v) => set({ shareVolume: v }),
  setSpeakingUsers: (ids) => set({ speakingUserIds: ids }),

  reset: () => {
    webrtcService.setMicEnabled(false);
    set({
      hasMicPermission: false,
      micMode: "push-to-talk",
      pushToTalkActive: false,
      actualMicEnabled: false,
      isTalking: false,
      shareVolume: 1,
      speakingUserIds: [],
    });
  },
}));
