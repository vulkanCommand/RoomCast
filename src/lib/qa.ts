export const QA_MODE_STORAGE_KEY = "roomcast.qaMode";

export const qaTestUsers = {
  host: {
    email: "qa-host-roomcast@example.com",
    password: "RoomCastQA#2026",
  },
  guest: {
    email: "qa-guest-roomcast@example.com",
    password: "RoomCastQA#2026",
  },
} as const;

export function canUseQaTools() {
  return import.meta.env.DEV;
}

export function enableQaMode() {
  if (!canUseQaTools() || typeof window === "undefined") return;
  window.sessionStorage.setItem(QA_MODE_STORAGE_KEY, "1");
}

export function disableQaMode() {
  if (!canUseQaTools() || typeof window === "undefined") return;
  window.sessionStorage.removeItem(QA_MODE_STORAGE_KEY);
}

export function isQaMode() {
  if (!canUseQaTools() || typeof window === "undefined") return false;
  return window.sessionStorage.getItem(QA_MODE_STORAGE_KEY) === "1";
}
