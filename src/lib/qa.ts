export const QA_MODE_STORAGE_KEY = "roomcast.qaMode";

export const qaBypassUsers = {
  host: {
    uid: "4GsKVrhVBaakDpWkX0cgY5lfUxM2",
    email: "qa-host-roomcast@example.com",
    displayName: "qa-host-roomcast",
  },
  guest: {
    uid: "xG0clBJrhNhpZQC7vMWyev1yCen2",
    email: "qa-guest-roomcast@example.com",
    displayName: "qa-guest-roomcast",
  },
} as const;

export type QaBypassRole = keyof typeof qaBypassUsers;

export function getQaBypassUserByUid(uid: string) {
  return Object.values(qaBypassUsers).find((user) => user.uid === uid) ?? null;
}

export function getQaBypassUserByRole(role: QaBypassRole) {
  return qaBypassUsers[role];
}

type QaEnv = {
  DEV?: boolean;
  VITE_ENABLE_QA_TOOLS?: string;
  VITE_ENABLE_QA_BYPASS?: string;
};

export function canUseQaBypass(env: QaEnv = import.meta.env) {
  return env.VITE_ENABLE_QA_BYPASS === "true";
}

export function canUseQaTools(env: QaEnv = import.meta.env) {
  return Boolean(env.DEV && env.VITE_ENABLE_QA_TOOLS === "true");
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
