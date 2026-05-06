import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Clock, KeyRound, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { useRoomStore } from "@/store/room";
import { AvatarOrb } from "@/components/AvatarOrb";
import { toast } from "sonner";

export default function Home() {
  const nav = useNavigate();
  const { user } = useAuthStore();
  const { createRoom } = useRoomStore();
  const [name, setName] = useState("");
  const roomName = name.trim();

  if (!user) return null;

  const onCreate = async () => {
    if (!roomName) {
      toast.error("Enter a room name first.");
      return;
    }

    try {
      const room = await createRoom(user, roomName);
      toast.success(`Room created - ${room.code}`);
      nav(`/room/${room.id}`);
    } catch (error) {
      console.error("Create room failed", error);
      const message = error instanceof Error ? error.message : "Check your Firebase setup.";
      toast.error(`Could not create room. ${message}`);
    }
  };

  return (
    <main className="container py-12">
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

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 glass p-8 shadow-elevated">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-primary opacity-30 blur-3xl" />
          <h2 className="font-display text-2xl font-semibold">Spin up a new room</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a private watch room. You'll be the host. Invite one guest with a 6-character code.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this room"
              className="bg-background/40 sm:flex-1"
              data-testid="room-name-input"
            />
            <Button
              type="button"
              onClick={onCreate}
              disabled={!roomName}
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              data-testid="create-room"
            >
              <Plus className="h-4 w-4" /> Create room
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Two-person private rooms</span>
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
    </main>
  );
}
