/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STUN_URL?: string;
  readonly VITE_TURN_URL?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
  readonly VITE_ENABLE_QA_TOOLS?: string;
  readonly VITE_QA_HOST_EMAIL?: string;
  readonly VITE_QA_HOST_PASSWORD?: string;
  readonly VITE_QA_GUEST_EMAIL?: string;
  readonly VITE_QA_GUEST_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  webkitAudioContext?: typeof AudioContext;
  __roomcastDebug?: Record<string, unknown>;
}
