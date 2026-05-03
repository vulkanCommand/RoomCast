import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Copy,
  LogOut,
  MessageSquare,
  MonitorPlay,
  MonitorUp,
  PhoneOff,
  Send,
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
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAuthStore } from "@/store/auth";
import { useRoomStore } from "@/store/room";
import { useVoiceStore } from "@/store/voice";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/roomcast";
import { toast } from "sonner";

type SidePanel = "people" | "chat" | "settings" | null;

export default function Room() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const { user, isAuthed } = useAuthStore();
  const {
    room,
    participants,
    messages,
    sharingUserId,
    startSharing,
    stopSharing,
    sendMessage,
    leaveRoom,
    endRoom,
    addSystemMessage,
  } = useRoomStore();
  const { shareVolume, setShareVolume, isTalking } = useVoiceStore();
  const [panel, setPanel] = useState<SidePanel>("chat");
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isAuthed) nav("/login");
  }, [isAuthed, nav]);

  useEffect(() => {
    if (!room || room.id !== roomId) {
      // if no live room (e.g., direct URL refresh), bounce home
      if (!room) nav("/home");
    }
  }, [room, roomId, nav]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!room?.startedAt) return;
    const t = setInterval(() => setElapsed(Date.now() - (room.startedAt || Date.now())), 1000);
    return () => clearInterval(t);
  }, [room?.startedAt]);

  const me = useMemo(() => participants.find((p) => p.id === user?.id), [participants, user]);
  const sharer = useMemo(() => participants.find((p) => p.id === sharingUserId), [participants, sharingUserId]);
  const isHost = me?.role === "host";

  if (!room || !user) return null;

  const onCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      toast.success("Room code copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const onShare = async () => {
    // PLACEHOLDER: real getDisplayMedia call wired later by Codex.
    // const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    startSharing(user.id);
    addSystemMessage(`${user.displayName} started sharing.`);
    toast.success("Sharing your screen");
  };

  const onStopShare = () => {
    stopSharing();
    addSystemMessage(`${user.displayName} stopped sharing.`);
  };

  const onLeave = () => {
    leaveRoom(user.id);
    if (isHost) endRoom();
    nav(`/ended?room=${room.id}`);
  };

  const onEnd = () => {
    endRoom();
    nav(`/ended?room=${room.id}`);
  };

  const onSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(user, chatInput);
    setChatInput("");
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 glass px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/home" aria-label="RoomCast home">
            <BrandLogo size="sm" />
          </Link>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="hidden flex-col sm:flex">
            <span className="font-display text-sm font-semibold">{room.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {participants.length}/{room.maxParticipants} watching · {formatDuration(elapsed)}
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
          <IconBtn active={panel === "chat"} onClick={() => setPanel(panel === "chat" ? null : "chat")} label="Chat">
            <MessageSquare className="h-4 w-4" />
          </IconBtn>
          <IconBtn active={panel === "settings"} onClick={() => setPanel(panel === "settings" ? null : "settings")} label="Settings">
            <Settings2 className="h-4 w-4" />
          </IconBtn>
          <Button variant="ghost" size="sm" className="ml-2 text-muted-foreground hover:text-destructive" onClick={onLeave}>
            <LogOut className="h-4 w-4" /> Leave
          </Button>
          {isHost && (
            <Button variant="destructive" size="sm" onClick={onEnd}>
              <PhoneOff className="h-4 w-4" /> End
            </Button>
          )}
        </div>
      </header>

      {/* Main */}
      <div className="flex min-h-0 flex-1">
        {/* Stage */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border/70 bg-black shadow-elevated">
              {sharer ? (
                <ScreenStage sharerName={sharer.displayName} sharerHue={sharer.avatarColor} />
              ) : (
                <EmptyStage canShare onShare={onShare} />
              )}

              {/* Speaking overlay strip */}
              <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
                {sharer && (
                  <div className="pointer-events-auto flex items-center gap-2 rounded-full glass px-2.5 py-1.5 text-xs">
                    <AvatarOrb initials={sharer.initials} hue={sharer.avatarColor} size="xs" />
                    <span className="font-medium">{sharer.displayName}</span>
                    <span className="text-muted-foreground">is sharing</span>
                  </div>
                )}
              </div>

              {/* Active speakers ribbon */}
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

          {/* Bottom dock */}
          <div className="shrink-0 border-t border-border/60 bg-card/40 px-4 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {sharingUserId === user.id ? (
                  <Button variant="destructive" onClick={onStopShare}>
                    <StopCircle className="h-4 w-4" /> Stop sharing
                  </Button>
                ) : (
                  <Button onClick={onShare} className="bg-gradient-primary text-primary-foreground shadow-glow">
                    <MonitorUp className="h-4 w-4" /> Share screen
                  </Button>
                )}

                <div className="hidden items-center gap-2 rounded-full glass px-3 py-2 sm:flex">
                  <Volume2 className={cn("h-4 w-4", isTalking ? "text-primary" : "text-muted-foreground")} />
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

        {/* Side panel */}
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
                          {p.isSharing && <span className="text-primary">· sharing</span>}
                          {p.isSpeaking && <span className="text-success">· speaking</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {panel === "chat" && (
              <>
                <div ref={chatScrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
                  {messages.map((m) => (
                    <div key={m.id} className={cn("flex gap-3", m.system && "opacity-80")}>
                      {!m.system && <AvatarOrb initials={m.initials} hue={m.avatarColor} size="sm" />}
                      <div className={cn("min-w-0 flex-1", m.system && "text-center text-xs text-muted-foreground")}>
                        {m.system ? (
                          <span>{m.text}</span>
                        ) : (
                          <>
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-semibold">{m.displayName}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground/90 break-words">{m.text}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={onSend} className="flex items-center gap-2 border-t border-border/60 p-3">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send a message"
                    className="bg-background/40"
                  />
                  <Button type="submit" size="icon" className="bg-gradient-primary text-primary-foreground">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            )}

            {panel === "settings" && (
              <div className="flex-1 space-y-6 overflow-y-auto p-5 text-sm">
                <SettingRow title="Share audio" hint="Volume of the shared screen audio. Auto-ducks while you talk.">
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

                <SettingRow title="Microphone" hint="Real device selection wires later via WebRTC.">
                  <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                    Default device · placeholder
                  </div>
                </SettingRow>

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

function EmptyStage({ onShare }: { canShare?: boolean; onShare: () => void }) {
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
            Share your screen to start the watch party. Voice channel is already open — hold Space to talk.
          </p>
        </div>
        <Button onClick={onShare} className="bg-gradient-primary text-primary-foreground shadow-glow">
          <MonitorUp className="h-4 w-4" /> Share your screen
        </Button>
      </div>
    </div>
  );
}

function ScreenStage({ sharerName, sharerHue }: { sharerName: string; sharerHue: string }) {
  return (
    <div className="absolute inset-0">
      {/* Mock cinematic screen surface */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(800px 500px at 30% 20%, hsl(${sharerHue} 80% 30% / 0.55), transparent 60%),
                       radial-gradient(700px 500px at 80% 90%, hsl(${(parseInt(sharerHue) + 60) % 360} 80% 30% / 0.45), transparent 60%),
                       linear-gradient(180deg, #06070d, #03040a)`,
        }}
      />
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-gradient-aurora" />
          <p className="font-display text-2xl font-semibold">{sharerName}'s screen</p>
          <p className="mt-1 text-sm text-muted-foreground">Live · 1080p · WebRTC placeholder</p>
        </div>
      </div>
      {/* film grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
        }}
      />
    </div>
  );
}
