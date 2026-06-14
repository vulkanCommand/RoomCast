import { describe, expect, it } from "vitest";
import {
  deriveGuestDisplayConnectionStatus,
  deriveRoomStageState,
  shouldRequestPlaybackReconnect,
} from "@/lib/playbackHealth";

describe("playback health helpers", () => {
  it("keeps guest in connecting stage until playback becomes ready", () => {
    expect(
      deriveRoomStageState({
        isViewingOwnShare: false,
        hasVideoTrack: true,
        hasSharer: true,
        activeSessionId: "session-1",
        guestPlaybackState: "joining",
      }),
    ).toBe("connecting");

    expect(
      deriveRoomStageState({
        isViewingOwnShare: false,
        hasVideoTrack: true,
        hasSharer: true,
        activeSessionId: "session-1",
        guestPlaybackState: "ready",
      }),
    ).toBe("video");
  });

  it("derives guest connection status from playback readiness, not only active session state", () => {
    expect(
      deriveGuestDisplayConnectionStatus({
        isViewingOwnShare: false,
        activeSessionId: "session-1",
        roomConnectionStatus: "connected",
        guestPlaybackState: "joining",
        playbackBlocked: false,
      }),
    ).toBe("reconnecting");

    expect(
      deriveGuestDisplayConnectionStatus({
        isViewingOwnShare: false,
        activeSessionId: "session-1",
        roomConnectionStatus: "connected",
        guestPlaybackState: "ready",
        playbackBlocked: false,
      }),
    ).toBe("connected");
  });

  it("requests reconnect only for an unhealthy guest playback state", () => {
    expect(
      shouldRequestPlaybackReconnect({
        currentRole: "guest",
        activeSessionId: "session-1",
        sharingStatus: "sharing",
        guestPlaybackState: "joining",
        playbackBlocked: false,
        connectionState: "new",
        iceConnectionState: "new",
        sessionAgeMs: 12001,
        requestedByUid: null,
        requestSessionId: null,
        userId: "guest-1",
      }),
    ).toBe(true);

    expect(
      shouldRequestPlaybackReconnect({
        currentRole: "guest",
        activeSessionId: "session-1",
        sharingStatus: "sharing",
        guestPlaybackState: "ready",
        playbackBlocked: false,
        connectionState: "connected",
        iceConnectionState: "connected",
        sessionAgeMs: 12001,
        requestedByUid: null,
        requestSessionId: null,
        userId: "guest-1",
      }),
    ).toBe(false);

    expect(
      shouldRequestPlaybackReconnect({
        currentRole: "guest",
        activeSessionId: "session-1",
        sharingStatus: "sharing",
        guestPlaybackState: "stalled",
        playbackBlocked: true,
        connectionState: "failed",
        iceConnectionState: "failed",
        sessionAgeMs: 12001,
        requestedByUid: null,
        requestSessionId: null,
        userId: "guest-1",
      }),
    ).toBe(false);

    expect(
      shouldRequestPlaybackReconnect({
        currentRole: "guest",
        activeSessionId: "session-1",
        sharingStatus: "sharing",
        guestPlaybackState: "joining",
        playbackBlocked: false,
        connectionState: "new",
        iceConnectionState: "new",
        sessionAgeMs: 3000,
        requestedByUid: null,
        requestSessionId: null,
        userId: "guest-1",
      }),
    ).toBe(false);
  });
});
