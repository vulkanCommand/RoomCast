export const QA_MODE_STORAGE_KEY = "roomcast.qaMode";

export const qaTestUsers = {
  host: {
    email: import.meta.env.VITE_QA_HOST_EMAIL?.trim() || "",
    password: import.meta.env.VITE_QA_HOST_PASSWORD?.trim() || "",
  },
  guest: {
    email: import.meta.env.VITE_QA_GUEST_EMAIL?.trim() || "",
    password: import.meta.env.VITE_QA_GUEST_PASSWORD?.trim() || "",
  },
} as const;

export function canUseQaTools() {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_ENABLE_QA_TOOLS === "true" &&
    Boolean(qaTestUsers.host.email && qaTestUsers.host.password && qaTestUsers.guest.email && qaTestUsers.guest.password)
  );
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
