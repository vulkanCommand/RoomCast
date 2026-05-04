import { create } from "zustand";
import * as webrtcService from "@/services/webrtcService";

interface VoiceState {
  // local mic state
  micEnabled: boolean;
  isTalking: boolean;
  // ducking: when talking, screen share audio is reduced
  shareVolume: number; // 0..1
  // who is speaking right now (mock: id list)
  speakingUserIds: string[];
  setMicEnabled: (v: boolean) => void;
  startTalking: () => void;
  stopTalking: () => void;
  setShareVolume: (v: number) => void;
  setSpeakingUsers: (ids: string[]) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  micEnabled: false,
  isTalking: false,
  shareVolume: 1,
  speakingUserIds: [],
  setMicEnabled: (v) => {
    webrtcService.setMicEnabled(v);
    set({ micEnabled: v });
  },
  startTalking: () => {
    webrtcService.setMicEnabled(true);
    webrtcService.sendSpeaking(true);
    set({ micEnabled: true, isTalking: true, shareVolume: 0.25 });
  },
  stopTalking: () => {
    webrtcService.setMicEnabled(false);
    webrtcService.sendSpeaking(false);
    set({ micEnabled: false, isTalking: false, shareVolume: 1 });
  },
  setShareVolume: (v) => set({ shareVolume: v }),
  setSpeakingUsers: (ids) => set({ speakingUserIds: ids }),
}));
