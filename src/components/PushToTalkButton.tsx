import { useRef } from "react";
import { Mic, MicOff, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceStore } from "@/store/voice";
import { useRoomStore } from "@/store/room";
import { useAuthStore } from "@/store/auth";
import { voiceActivityLabel } from "@/lib/voice";

/**
 * Premium push-to-talk button.
 * - Hold the button to talk in push-to-talk mode
 * - Keyboard handling lives at the Room page so fullscreen Space can be captured reliably
 */
export function PushToTalkButton() {
  const { user } = useAuthStore();
  const {
    hasMicPermission,
    micMode,
    actualMicEnabled,
    isTalking,
    startTalking,
    stopTalking,
  } = useVoiceStore();
  const { setSpeaking } = useRoomStore();
  const holdRef = useRef(false);

  const begin = () => {
    if (holdRef.current || micMode === "always-on" || !hasMicPermission) return;
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

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
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
          (isTalking || (micMode === "always-on" && actualMicEnabled)) && "scale-105 animate-pulse-ring",
          (!hasMicPermission || micMode === "always-on") && "opacity-80",
        )}
        aria-pressed={isTalking}
        aria-label="Push to talk"
        data-testid="push-to-talk"
        disabled={!hasMicPermission || micMode === "always-on"}
      >
        {hasMicPermission ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        <span
          className={cn(
            "pointer-events-none absolute -inset-2 rounded-full opacity-0 transition-opacity",
            "bg-gradient-aurora blur-xl",
            (isTalking || (micMode === "always-on" && actualMicEnabled)) && "opacity-60",
          )}
        />
      </button>
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {voiceActivityLabel(micMode, isTalking, hasMicPermission)}
        </span>
        <span className="text-xs text-muted-foreground">Hold Space or press Talk</span>
        {micMode === "always-on" && actualMicEnabled && (
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
            <Radio className="h-3.5 w-3.5" /> Mic live
          </div>
        )}
        {isTalking && micMode === "push-to-talk" && (
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
