import { describe, expect, it } from "vitest";
import { canUseQaBypass, canUseQaTools, getQaBypassUserByUid, qaBypassUsers } from "@/lib/qa";

describe("QA bypass configuration", () => {
  it("only enables the bypass when the frontend flag is true", () => {
    expect(canUseQaBypass({ VITE_ENABLE_QA_BYPASS: "true" })).toBe(true);
    expect(canUseQaBypass({ VITE_ENABLE_QA_BYPASS: "false" })).toBe(false);
    expect(canUseQaBypass({})).toBe(false);
  });

  it("keeps QA media tools gated to dev mode", () => {
    expect(canUseQaTools({ DEV: true, VITE_ENABLE_QA_TOOLS: "true" })).toBe(true);
    expect(canUseQaTools({ DEV: false, VITE_ENABLE_QA_TOOLS: "true" })).toBe(false);
  });

  it("uses the fixed QA identities only", () => {
    expect(qaBypassUsers.host.uid).toBe("4GsKVrhVBaakDpWkX0cgY5lfUxM2");
    expect(qaBypassUsers.guest.uid).toBe("xG0clBJrhNhpZQC7vMWyev1yCen2");
    expect(getQaBypassUserByUid("4GsKVrhVBaakDpWkX0cgY5lfUxM2")?.displayName).toBe("qa-host-roomcast");
    expect(getQaBypassUserByUid("xG0clBJrhNhpZQC7vMWyev1yCen2")?.displayName).toBe("qa-guest-roomcast");
  });
});
