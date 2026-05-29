import { describe, expect, it } from "vitest";
import { deriveConnectionStatus, isParticipantSharing, isRoomSharing } from "@/lib/roomState";

describe("room state helpers", () => {
  it("treats an active sharing session as connected", () => {
    expect(
      deriveConnectionStatus({
        status: "connected",
        activeSessionId: "session-1",
        sharingStatus: "sharing",
        reconnectRequest: null,
      }),
    ).toBe("connected");
  });

  it("marks reconnecting when a reconnect request is present", () => {
    expect(
      deriveConnectionStatus({
        status: "connected",
        activeSessionId: "session-1",
        sharingStatus: "sharing",
        reconnectRequest: {
          requestedByUid: "guest-1",
          requestedAt: Date.now(),
          sessionId: "session-1",
        },
      }),
    ).toBe("reconnecting");
  });

  it("does not mark the host as sharing when there is no active sharing session", () => {
    const room = {
      hostId: "host-1",
      status: "connected" as const,
      activeSessionId: null,
      sharingStatus: "stopped" as const,
      reconnectRequest: null,
    };

    expect(isRoomSharing(room)).toBe(false);
    expect(isParticipantSharing(room, "host-1")).toBe(false);
  });
});
