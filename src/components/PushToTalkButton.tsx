import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceStore } from "@/store/voice";
import { useRoomStore } from "@/store/room";
import { useAuthStore } from "@/store/auth";
import * as webrtcService from "@/services/webrtcService";

/**
 * Premium push-to-talk button.
 * - Hold spacebar OR press-and-hold the button to talk
 * - Ducks share audio from 100% -> 25% while talking
 * - Pulsing ring + waveform when active
 * Controls the WebRTC microphone track. The mic remains disabled unless held.
 */
export function PushToTalkButton() {
  const { user } = useAuthStore();
  const { isTalking, startTalking, stopTalking, micEnabled, setMicEnabled } = useVoiceStore();
  const { setSpeaking } = useRoomStore();
  const holdRef = useRef(false);
  const [granted, setGranted] = useState<boolean>(micEnabled);

  const begin = () => {
    if (holdRef.current) return;
    holdRef.current = true;
    startTalking();
    if (user) setSpeaking(user.id, true);
  };
  const end = () => {
    if (!holdRef.current) return;
    holdRef.current = false;
    stopTalking();
    if (user) setSpeaking(user.id, false);
  };

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !(e.target as HTMLElement)?.matches?.("input,textarea")) {
        e.preventDefault();
        begin();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        end();
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const requestMic = async () => {
    try {
      await webrtcService.startMicrophone();
      setMicEnabled(false);
      setGranted(true);
    } catch {
      setGranted(false);
    }
  };

  if (!granted) {
    return (
      <button
        onClick={requestMic}
        className="inline-flex items-center gap-2 rounded-full glass px-5 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors"
      >
        <MicOff className="h-4 w-4" /> Enable microphone
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onMouseDown={begin}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={(e) => {
          e.preventDefault();
          begin();
        }}
        onTouchEnd={end}
        className={cn(
          "group relative inline-flex h-16 w-16 select-none items-center justify-center rounded-full transition-all",
          "bg-gradient-primary text-primary-foreground shadow-elevated",
          isTalking && "scale-105 animate-pulse-ring",
        )}
        aria-pressed={isTalking}
        aria-label="Push to talk"
      >
        <Mic className="h-6 w-6" />
        <span
          className={cn(
            "pointer-events-none absolute -inset-2 rounded-full opacity-0 transition-opacity",
            "bg-gradient-aurora blur-xl",
            isTalking && "opacity-60",
          )}
        />
      </button>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{isTalking ? "Transmitting..." : "Hold to talk"}</span>
        <span className="text-xs text-muted-foreground">Hold Space or this button</span>
        {isTalking && (
          <div className="mt-1 flex h-3 items-end gap-0.5">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span
                key={i}
                className="w-0.5 rounded-full bg-gradient-aurora animate-voice-wave"
                style={{ height: `${30 + ((i * 13) % 70)}%`, animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

