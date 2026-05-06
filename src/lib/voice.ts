export type MicMode = "push-to-talk" | "always-on";

export function computeActualMicEnabled(micMode: MicMode, pushToTalkActive: boolean) {
  return micMode === "always-on" || pushToTalkActive;
}

export function voiceModeLabel(micMode: MicMode) {
  return micMode === "always-on" ? "Mic always on" : "Push-to-talk mode";
}

export function voiceActivityLabel(micMode: MicMode, pushToTalkActive: boolean, hasMicPermission: boolean) {
  if (!hasMicPermission) return "Microphone access required";
  if (micMode === "always-on") return "Mic live";
  return pushToTalkActive ? "Talking..." : "Push-to-talk mode";
}
