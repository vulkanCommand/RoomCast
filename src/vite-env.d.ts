/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STUN_URL?: string;
  readonly VITE_TURN_URL?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
  readonly VITE_BASE_URL?: string;
  readonly VITE_ENABLE_QA_BYPASS?: string;
  readonly VITE_ENABLE_QA_TOOLS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  webkitAudioContext?: typeof AudioContext;
  __roomcastDebug?: Record<string, unknown>;
}
