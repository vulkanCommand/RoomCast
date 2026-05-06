/// <reference types="vite/client" />

interface Window {
  webkitAudioContext?: typeof AudioContext;
  __roomcastDebug?: Record<string, unknown>;
}
