import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, KeyRound, Clock, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { useRoomStore } from "@/store/room";
import { AvatarOrb } from "@/components/AvatarOrb";
import { toast } from "sonner";
import { formatRelative } from "@/lib/roomcast";

interface RecentRoom {
  id: string;
  name: string;
  code: string;
  endedAt: number;
  participants: number;
}

const recentRooms: RecentRoom[] = [
  { id: "r1", name: "Friday Movie Night", code: "MOVIE7", endedAt: Date.now() - 1000 * 60 * 60 * 22, participants: 5 },
  { id: "r2", name: "Demo Day Run-through", code: "DEMO42", endedAt: Date.now() - 1000 * 60 * 60 * 72, participants: 3 },
  { id: "r3", name: "F1 Watchalong", code: "F1QUAL", endedAt: Date.now() - 1000 * 60 * 60 * 24 * 6, participants: 8 },
];

export default function Home() {
  const nav = useNavigate();
  const { user } = useAuthStore();
  const { createRoom } = useRoomStore();
  const [name, setName] = useState("Movie Night");

  if (!user) {
    nav("/login");
    return null;
  }

  const onCreate = () => {
    const room = createRoom(user, name || "Untitled Room");
    toast.success(`Room created · ${room.code}`);
    nav(`/room/${room.id}`);
  };

  return (
    <main className="container py-12">
      {/* Hero greeting */}
      <section className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-3">
            <AvatarOrb initials={user.initials} hue={user.avatarColor} size="lg" />
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight">{user.displayName}</h1>
            </div>
          </div>
        </div>
        <Button asChild variant="ghost" className="glass">
          <Link to="/join"><KeyRound className="h-4 w-4" /> Join with code</Link>
        </Button>
      </section>

      {/* Create room */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 glass p-8 shadow-elevated">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-primary opacity-30 blur-3xl" />
          <h2 className="font-display text-2xl font-semibold">Spin up a new room</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a private watch room. You'll be the host. Invite friends with a 6-character code.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Room name"
              className="bg-background/40 sm:flex-1"
            />
            <Button onClick={onCreate} className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Plus className="h-4 w-4" /> Create room
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Up to 12 participants</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Auto-ends after host leaves</span>
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/40 p-6">
          <h3 className="font-display text-lg font-semibold">Quick join</h3>
          <p className="mt-1 text-sm text-muted-foreground">Have a code from a friend? Jump straight in.</p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/join">Enter room code <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <div className="mt-6 rounded-xl bg-secondary/40 p-4 text-xs text-muted-foreground">
            <strong className="text-foreground">Pro tip:</strong> hold <kbd className="rounded bg-background px-1.5 py-0.5 font-mono">Space</kbd> in any room to talk.
          </div>
        </div>
      </section>

      {/* Recent rooms */}
      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <h3 className="font-display text-xl font-semibold">Recent rooms</h3>
          <span className="text-xs text-muted-foreground">Mock data · history connects later</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentRooms.map((r) => (
            <div
              key={r.id}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/40 p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-secondary/60 px-2 py-0.5 font-mono text-xs">{r.code}</span>
                <span className="text-[11px] text-muted-foreground">{formatRelative(r.endedAt)}</span>
              </div>
              <h4 className="mt-3 font-display text-lg font-semibold">{r.name}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{r.participants} participants</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
