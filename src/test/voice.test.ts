import { describe, expect, it } from "vitest";
import { computeActualMicEnabled, voiceActivityLabel } from "@/lib/voice";

describe("voice helpers", () => {
  it("enables the mic when always-on mode is active", () => {
    expect(computeActualMicEnabled("always-on", false)).toBe(true);
  });

  it("enables the mic only while push-to-talk is active in push-to-talk mode", () => {
    expect(computeActualMicEnabled("push-to-talk", false)).toBe(false);
    expect(computeActualMicEnabled("push-to-talk", true)).toBe(true);
  });

  it("returns the right status labels for voice UI", () => {
    expect(voiceActivityLabel("push-to-talk", false, true)).toBe("Push-to-talk mode");
    expect(voiceActivityLabel("push-to-talk", true, true)).toBe("Talking...");
    expect(voiceActivityLabel("always-on", false, true)).toBe("Mic live");
    expect(voiceActivityLabel("always-on", false, false)).toBe("Microphone access required");
  });
});
