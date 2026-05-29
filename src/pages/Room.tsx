import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Copy,
  LogOut,
  Mic,
  MonitorPlay,
  MonitorUp,
  PhoneOff,
  Settings2,
  StopCircle,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { LiveBadge } from "@/components/LiveBadge";
import { AvatarOrb } from "@/components/AvatarOrb";
import { PushToTalkButton } from "@/components/PushToTalkButton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/auth";
import { useRoomStore } from "@/store/room";
import { useVoiceStore } from "@/store/voice";
import { cn } from "@/lib/utils";
import { shouldBlockRoomSpaceKey } from "@/lib/keyboard";
import { voiceModeLabel } from "@/lib/voice";
import { formatDuration } from "@/lib/roomcast";
import { isQaMode } from "@/lib/qa";
import { toast } from "sonner";
import * as webrtcService from "@/services/webrtcService";
import * as roomService from "@/services/roomService";

type SidePanel = "people" | "voice" | "settings" | null;

export default function Room() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const { user } = useAuthStore();
  const {
    room,
    participants,
    currentRole,
    connectionStatus,
    sharingUserId,
    activeSessionId,
    joinRoom,
    subscribeToRoom,
    startSharing,
    stopSharing,
    leaveRoom,
    endRoom,
  } = useRoomStore();
  const {
    shareVolume,
    setShareVolume,
    isTalking,
    micMode,
    setMicMode,
    hasMicPermission,
    setMicPermission,
    actualMicEnabled,
    startTalking,
    stopTalking,
  } = useVoiceStore();
  const [panel, setPanel] = useState<SidePanel>("voice");
  const [elapsed, setElapsed] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isStartingShare, setIsStartingShare] = useState(false);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const reconnectRequestRef = useRef<string | null>(null);
  const hostReconnectSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!roomId || !user) return;
    let roomUnsub: (() => void) | undefined;
    let cancelled = false;

    joinRoom(roomId, user)
      .then((joined) => {
        if (cancelled || !joined) return;
        roomUnsub = subscribeToRoom(joined.id, user);
      })
      .catch(() => {
        toast.error("Could not open this room.");
        nav("/home", { replace: true });
      });

    const localUnsub = webrtcService.onLocalStream(setLocalStream);
    const remoteUnsub = webrtcService.onRemoteStream(setRemoteStream);
    const speakingUnsub = webrtcService.onRemoteSpeaking((speaking) => {
      const remoteParticipant = useRoomStore.getState().participants.find((p) => p.id !== user.id);
      if (remoteParticipant) useRoomStore.getState().setSpeaking(remoteParticipant.id, speaking);
    });
    const endedUnsub = webrtcService.onSharingEnded(() => {
      void stopSharing();
      toast.info("Screen sharing stopped. You can start sharing again.");
    });

    return () => {
      cancelled = true;
      roomUnsub?.();
      localUnsub();
      remoteUnsub();
      speakingUnsub();
      endedUnsub();
    };
  }, [joinRoom, nav, roomId, stopSharing, subscribeToRoom, user]);

  useEffect(() => {
    if (!room?.id || currentRole !== "guest" || !activeSessionId) return;
    void webrtcService.joinGuestSession(room.id, activeSessionId)
      .then((result) => {
        if (!result.micWarning) setMicPermission(true);
        if (result.micWarning) toast.warning(result.micWarning);
      })
      .catch(() => {
        toast.error("Could not connect to the host stream.");
      });
  }, [activeSessionId, currentRole, room?.id, setMicPermission]);

  useEffect(() => {
    if (!activeSessionId) {
      webrtcService.clearSessionState();
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (room?.status !== "ended" || !room.id) return;
    webrtcService.cleanupConnection();
    nav(`/ended?room=${room.id}`, { replace: true });
  }, [nav, room?.id, room?.status]);

  useEffect(() => {
    if (currentRole !== "guest" || !room?.id || !activeSessionId || room.sharingStatus !== "sharing") {
      reconnectRequestRef.current = null;
      return;
    }
    const reconnectKey = `${room.id}:${activeSessionId}`;
    const timeout = window.setTimeout(() => {
      if (webrtcService.hasRemoteVideoTrack()) return;
      if (room.reconnectRequest?.requestedByUid === user.id && room.reconnectRequest?.sessionId === activeSessionId) {
        reconnectRequestRef.current = reconnectKey;
        return;
      }
      if (reconnectRequestRef.current === reconnectKey) return;
      reconnectRequestRef.current = reconnectKey;
      void roomService.requestReconnect(room.id, activeSessionId).catch((error) => {
        reconnectRequestRef.current = null;
        console.error("Reconnect request failed", error);
      });
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [activeSessionId, currentRole, room?.id, room?.reconnectRequest, room?.sharingStatus, user.id]);

  useEffect(() => {
    if (!room?.reconnectRequest) {
      hostReconnectSessionRef.current = null;
    }
  }, [room?.reconnectRequest]);

  useEffect(() => {
    if (
      currentRole !== "host" ||
      !room?.id ||
      !room.reconnectRequest ||
      !webrtcService.hasLocalScreenShare() ||
      isStartingShare
    ) {
      return;
    }
    const reconnectSessionId = room.reconnectRequest.sessionId;
    if (hostReconnectSessionRef.current === reconnectSessionId) return;
    hostReconnectSessionRef.current = reconnectSessionId;
    void (async () => {
      try {
        setIsStartingShare(true);
        const result = await startSharing(user.id, { reuseScreen: true });
        if (result?.micWarning) toast.warning(result.micWarning);
        toast.info("Guest reconnected. Refreshing the live session.");
      } catch (error) {
        hostReconnectSessionRef.current = null;
        console.error("Reconnect restart failed", error);
        toast.error("Could not refresh the session for the rejoining guest.");
      } finally {
        setIsStartingShare(false);
      }
    })();
  }, [currentRole, isStartingShare, room?.id, room?.reconnectRequest, startSharing, user.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldBlockRoomSpaceKey(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (micMode === "always-on" || event.repeat) return;
      startTalking();
      useRoomStore.getState().setSpeaking(user.id, true);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!shouldBlockRoomSpaceKey(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (micMode === "always-on") return;
      stopTalking();
      useRoomStore.getState().setSpeaking(user.id, false);
    };

    document.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("keyup", onKeyUp, { capture: true });
    return () => {
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("keyup", onKeyUp, { capture: true });
    };
  }, [micMode, startTalking, stopTalking, user.id]);

  useEffect(() => {
    const stream = sharingUserId === user.id ? localStream : remoteStream;
    if (!screenVideoRef.current) return;
    screenVideoRef.current.srcObject = stream;
  }, [localStream, remoteStream, sharingUserId, user.id]);

  useEffect(() => {
    if (!remoteAudioRef.current) return;
    const shouldAttachAudioOnly = Boolean(remoteStream && remoteStream.getAudioTracks().length && !remoteStream.getVideoTracks().length);
    remoteAudioRef.current.srcObject = shouldAttachAudioOnly ? remoteStream : null;
  }, [remoteStream]);

  useEffect(() => {
    const ducked = isTalking || participants.some((p) => p.id !== user.id && p.isSpeaking);
    const volume = ducked ? 0.25 : shareVolume;
    if (screenVideoRef.current) screenVideoRef.current.volume = volume;
    if (remoteAudioRef.current) remoteAudioRef.current.volume = volume;
  }, [isTalking, participants, shareVolume, user.id]);

  useEffect(() => {
    if (!room?.startedAt) return;
    const t = setInterval(() => setElapsed(Date.now() - (room.startedAt || Date.now())), 1000);
    return () => clearInterval(t);
  }, [room?.startedAt]);

  const me = useMemo(() => participants.find((p) => p.id === user?.id), [participants, user]);
  const sharer = useMemo(() => participants.find((p) => p.id === sharingUserId), [participants, sharingUserId]);
  const isHost = currentRole === "host" || me?.role === "host";
  const screenStream = sharingUserId === user.id ? localStream : remoteStream;
  const hasScreenVideo = Boolean(screenStream?.getVideoTracks().length);
  const hasRemoteAudioOnly = Boolean(remoteStream?.getAudioTracks().length && !remoteStream.getVideoTracks().length);
  const isViewingOwnShare = sharingUserId === user.id;
  const shouldDuck = isTalking || participants.some((p) => p.id !== user.id && p.isSpeaking);
  const qaMode = isQaMode();

  if (!room || !user) return null;

  const onCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      toast.success("Room code copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const onCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy invite link");
    }
  };

  const onShare = async () => {
    if (!isHost) {
      toast.error("Only the host can share in this MVP.");
      return;
    }
    try {
      setIsStartingShare(true);
      const result = await startSharing(user.id);
      if (result?.micWarning) {
        toast.warning(result.micWarning);
      } else if (!hasMicPermission) {
        setMicPermission(true);
      }
      toast.success("Sharing your screen");
    } catch (error) {
      console.error("Start sharing failed", error);
      toast.error("Screen sharing did not start. Check screen permissions and try again.");
    } finally {
      setIsStartingShare(false);
    }
  };

  const onStopShare = () => {
    void stopSharing();
  };

  const onLeave = async () => {
    try {
      const result = await leaveRoom(user.id);
      if (result?.ended) {
        nav(`/ended?room=${room.id}`, { replace: true });
        return;
      }
      nav("/home", { replace: true });
    } catch (error) {
      console.error("Leave room failed", error);
      toast.error("Could not leave the room cleanly.");
    }
  };

  const onEnd = async () => {
    await endRoom();
    nav(`/ended?room=${room.id}`);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 glass px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/home" aria-label="RoomCast home">
            <BrandLogo size="sm" />
          </Link>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="hidden flex-col sm:flex">
            <span className="font-display text-sm font-semibold">{room.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {participants.length}/{room.maxParticipants} in room - {formatDuration(elapsed)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCopyCode}
            className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 font-mono text-xs hover:bg-white/5"
            title="Copy room code"
          >
            {room.code} <Copy className="h-3.5 w-3.5" />
          </button>
          {sharingUserId && <LiveBadge />}
        </div>

        <div className="flex items-center gap-1.5">
          <IconBtn active={panel === "people"} onClick={() => setPanel(panel === "people" ? null : "people")} label="People">
            <Users className="h-4 w-4" />
          </IconBtn>
          <IconBtn active={panel === "voice"} onClick={() => setPanel(panel === "voice" ? null : "voice")} label="Voice">
            <Mic className="h-4 w-4" />
          </IconBtn>
          <IconBtn active={panel === "settings"} onClick={() => setPanel(panel === "settings" ? null : "settings")} label="Settings">
            <Settings2 className="h-4 w-4" />
          </IconBtn>
          <Button variant="ghost" size="sm" className="ml-2 text-muted-foreground hover:text-destructive" onClick={() => void onLeave()}>
            <LogOut className="h-4 w-4" /> Leave
          </Button>
          {isHost && (
            <Button variant="destructive" size="sm" onClick={onEnd}>
              <PhoneOff className="h-4 w-4" /> End
            </Button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border/70 bg-black shadow-elevated">
              {hasScreenVideo ? (
                <VideoStage videoRef={screenVideoRef} muted={isViewingOwnShare} />
              ) : activeSessionId && sharer ? (
                <ConnectingStage sharerName={sharer.displayName} />
              ) : (
                <EmptyStage canShare={isHost} onShare={onShare} />
              )}
              {hasRemoteAudioOnly && <audio ref={remoteAudioRef} autoPlay playsInline />}

              <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
                {sharer && (
                  <div className="pointer-events-auto flex items-center gap-2 rounded-full glass px-2.5 py-1.5 text-xs">
                    <AvatarOrb initials={sharer.initials} hue={sharer.avatarColor} size="xs" />
                    <span className="font-medium">{sharer.displayName}</span>
                    <span className="text-muted-foreground">is sharing</span>
                  </div>
                )}
              </div>

              <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-2">
                {participants
                  .filter((p) => p.isSpeaking)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="pointer-events-auto flex items-center gap-2 rounded-full bg-primary/15 px-2.5 py-1 text-xs ring-1 ring-primary/30"
                    >
                      <AvatarOrb initials={p.initials} hue={p.avatarColor} size="xs" speaking />
                      <span>{p.displayName}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border/60 bg-card/40 px-4 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {sharingUserId === user.id ? (
                  <Button variant="destructive" onClick={onStopShare} data-testid="stop-sharing">
                    <StopCircle className="h-4 w-4" /> Stop sharing
                  </Button>
                ) : (
                  <Button onClick={onShare} disabled={!isHost} className="bg-gradient-primary text-primary-foreground shadow-glow" data-testid="share-screen">
                    <MonitorUp className="h-4 w-4" /> Share screen
                  </Button>
                )}

                <div className="hidden items-center gap-2 rounded-full glass px-3 py-2 sm:flex">
                  <Volume2 className={cn("h-4 w-4", shouldDuck ? "text-primary" : "text-muted-foreground")} />
                  <Slider
                    value={[Math.round(shareVolume * 100)]}
                    onValueChange={(v) => setShareVolume(v[0] / 100)}
                    max={100}
                    step={1}
                    className="w-32"
                  />
                  <span className="w-8 text-right font-mono text-xs text-muted-foreground">
                    {Math.round(shareVolume * 100)}
                  </span>
                </div>
              </div>

              <PushToTalkButton />
            </div>
          </div>
        </main>

        {panel && (
          <aside className="flex w-full max-w-sm shrink-0 flex-col border-l border-border/60 bg-card/40 backdrop-blur">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <h3 className="font-display text-sm font-semibold capitalize">{panel}</h3>
              <button onClick={() => setPanel(null)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            {panel === "people" && (
              <div className="flex-1 overflow-y-auto p-3">
                <ul className="space-y-1">
                  {participants.map((p) => (
                    <li
                      key={p.id}
                      className={cn(
                        "flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-secondary/60",
                        p.isSpeaking && "bg-primary/10",
                      )}
                    >
                      <AvatarOrb initials={p.initials} hue={p.avatarColor} size="md" speaking={p.isSpeaking} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{p.displayName}</span>
                          {p.id === user.id && <span className="text-[10px] text-muted-foreground">(you)</span>}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="capitalize">{p.role}</span>
                          {p.isSharing && <span className="text-primary">- sharing</span>}
                          {p.isSpeaking && <span className="text-success">- speaking</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {panel === "voice" && (
              <div className="flex-1 space-y-5 overflow-y-auto p-5 text-sm">
                <SettingRow title="Voice channel" hint="Browser permission is separate from whether your mic is actively transmitting.">
                  <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                    {!hasMicPermission
                      ? "Microphone access required"
                      : micMode === "always-on"
                        ? "Mic live"
                        : isTalking
                          ? "Talking..."
                          : "Push-to-talk mode"}
                  </div>
                </SettingRow>
                <SettingRow title="Connection" hint="Firestore handles signaling. WebRTC moves the live media directly.">
                  <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground capitalize">
                    {activeSessionId && !hasScreenVideo ? "reconnecting" : connectionStatus}
                  </div>
                </SettingRow>
                <Button variant="outline" className="w-full" onClick={onCopyInvite}>
                  <Copy className="h-4 w-4" /> Copy invite link
                </Button>
                {!hasMicPermission && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      try {
                        await webrtcService.ensureMicrophoneAccess();
                        setMicPermission(true);
                        toast.success("Microphone ready");
                      } catch {
                        toast.error("Microphone permission denied.");
                      }
                    }}
                  >
                    <Mic className="h-4 w-4" /> Enable microphone access
                  </Button>
                )}
              </div>
            )}

            {panel === "settings" && (
              <div className="flex-1 space-y-6 overflow-y-auto p-5 text-sm">
                <SettingRow title="Microphone mode" hint="Choose between always-on voice and push-to-talk.">
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-3">
                    <div>
                      <div className="text-sm font-medium">{voiceModeLabel(micMode)}</div>
                      <div className="text-xs text-muted-foreground">
                        {micMode === "always-on" ? "Mic stays live without holding Space." : "Hold Space or press Talk."}
                      </div>
                    </div>
                    <Switch
                      checked={micMode === "always-on"}
                      onCheckedChange={(checked) => setMicMode(checked ? "always-on" : "push-to-talk")}
                    />
                  </div>
                </SettingRow>

                <SettingRow title="Share audio" hint="Volume of RoomCast-owned shared media. Auto-ducks while you talk.">
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[Math.round(shareVolume * 100)]}
                      onValueChange={(v) => setShareVolume(v[0] / 100)}
                      max={100}
                      step={1}
                    />
                    <span className="w-10 text-right font-mono text-xs text-muted-foreground">
                      {Math.round(shareVolume * 100)}
                    </span>
                  </div>
                </SettingRow>

                <SettingRow title="Push-to-talk key" hint="Hold to transmit. Default: Spacebar.">
                  <div className="inline-flex items-center gap-2 rounded-md bg-secondary/60 px-3 py-1.5">
                    <kbd className="font-mono text-xs">Space</kbd>
                  </div>
                </SettingRow>

                <SettingRow title="Microphone" hint="Browser mic permission means RoomCast can access the device.">
                  <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                    {hasMicPermission ? "Microphone access granted" : "Microphone access not granted"}
                  </div>
                </SettingRow>

                {!hasScreenVideo && activeSessionId && (
                  <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs text-muted-foreground">
                    Reconnecting...
                  </div>
                )}

                {!activeSessionId && sharingUserId !== user.id && (
                  <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs text-muted-foreground">
                    Screen sharing stopped. You can start sharing again.
                  </div>
                )}

                {qaMode && sharingUserId === user.id && (
                  <Button
                    variant="outline"
                    className="w-full"
                    data-testid="qa-native-stop"
                    onClick={() => {
                      webrtcService.simulateNativeShareStopForQa();
                    }}
                  >
                    Simulate browser stop sharing
                  </Button>
                )}

                <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs text-muted-foreground">
                  Tip: Screen sharing works best on desktop browsers (Chrome, Edge, Safari 17+).
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        active && "bg-secondary text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SettingRow({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-medium">{title}</div>
      <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}

function EmptyStage({ canShare, onShare }: { canShare: boolean; onShare: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#15102e] via-[#0a0a18] to-[#070a13]">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="relative flex flex-col items-center gap-5 text-center">
        <div className="rounded-2xl bg-gradient-primary p-5 shadow-glow animate-float-slow">
          <MonitorPlay className="h-10 w-10 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold">Nobody is sharing yet</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {canShare
              ? "Share your screen to start the private watch room. Voice is ready when you are."
              : "Waiting for the host to start screen sharing. Voice is ready when you are."}
          </p>
        </div>
        {canShare && (
          <Button onClick={onShare} className="bg-gradient-primary text-primary-foreground shadow-glow">
            <MonitorUp className="h-4 w-4" /> Share your screen
          </Button>
        )}
      </div>
    </div>
  );
}

function ConnectingStage({ sharerName }: { sharerName: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#15102e] via-[#0a0a18] to-[#070a13]">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="relative text-center">
        <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-gradient-aurora" />
        <p className="font-display text-2xl font-semibold">{sharerName}'s screen</p>
        <p className="mt-1 text-sm text-muted-foreground">Reconnecting...</p>
      </div>
    </div>
  );
}

function VideoStage({ videoRef, muted }: { videoRef: React.RefObject<HTMLVideoElement>; muted?: boolean }) {
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      controls
      className="absolute inset-0 h-full w-full bg-black object-contain"
    />
  );
}
