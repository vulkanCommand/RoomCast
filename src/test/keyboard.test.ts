import { describe, expect, it } from "vitest";
import { shouldHandlePushToTalkKey } from "@/lib/keyboard";

describe("push-to-talk keyboard guard", () => {
  it("handles a non-repeating Space key when the target is not editable", () => {
    const target = document.createElement("div");
    expect(shouldHandlePushToTalkKey({ code: "Space", repeat: false, target })).toBe(true);
  });

  it("ignores repeated Space keydown events", () => {
    const target = document.createElement("div");
    expect(shouldHandlePushToTalkKey({ code: "Space", repeat: true, target })).toBe(false);
  });

  it("ignores Space while typing in an input", () => {
    const target = document.createElement("input");
    expect(shouldHandlePushToTalkKey({ code: "Space", repeat: false, target })).toBe(false);
  });
});
