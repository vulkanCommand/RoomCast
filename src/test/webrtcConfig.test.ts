import { describe, expect, it } from "vitest";
import { buildRtcConfiguration } from "@/services/webrtcService";

describe("RTC configuration", () => {
  it("always includes a STUN server fallback", () => {
    expect(buildRtcConfiguration({}).iceServers).toEqual([{ urls: "stun:stun.l.google.com:19302" }]);
  });

  it("adds TURN credentials from env when configured", () => {
    expect(
      buildRtcConfiguration({
        VITE_STUN_URL: "stun:custom.example.com:3478",
        VITE_TURN_URL: "turn:turn.example.com:3478",
        VITE_TURN_USERNAME: "roomcast",
        VITE_TURN_CREDENTIAL: "secret",
      }).iceServers,
    ).toEqual([
      { urls: "stun:custom.example.com:3478" },
      {
        urls: "turn:turn.example.com:3478",
        username: "roomcast",
        credential: "secret",
      },
    ]);
  });
});
