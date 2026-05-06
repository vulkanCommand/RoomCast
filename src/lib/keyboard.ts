export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("input, textarea, [contenteditable='true'], [contenteditable=''], [role='textbox']"),
  );
}

export function shouldBlockRoomSpaceKey(event: Pick<KeyboardEvent, "code" | "target">) {
  return event.code === "Space" && !isEditableTarget(event.target);
}

export function shouldHandlePushToTalkKey(event: Pick<KeyboardEvent, "code" | "repeat" | "target">) {
  return shouldBlockRoomSpaceKey(event) && !event.repeat;
}
