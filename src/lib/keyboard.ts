export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("input, textarea, [contenteditable='true'], [contenteditable=''], [role='textbox']"),
  );
}

export function shouldHandlePushToTalkKey(event: Pick<KeyboardEvent, "code" | "repeat" | "target">) {
  return event.code === "Space" && !event.repeat && !isEditableTarget(event.target);
}
