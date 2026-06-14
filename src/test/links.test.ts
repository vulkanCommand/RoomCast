import { describe, expect, it } from "vitest";
import { buildRoomInviteUrl } from "@/lib/links";

describe("room invite links", () => {
  it("uses the configured base URL when provided", () => {
    expect(buildRoomInviteUrl("room-123", { baseUrl: "https://roomcast.online" })).toBe(
      "https://roomcast.online/room/room-123",
    );
  });

  it("falls back to the current origin when no base URL is configured", () => {
    expect(buildRoomInviteUrl("room-123", { origin: "https://roomcast-52639.web.app" })).toBe(
      "https://roomcast-52639.web.app/room/room-123",
    );
  });
});
