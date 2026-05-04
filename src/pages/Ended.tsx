import { Link } from "react-router-dom";
import { Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { useRoomStore } from "@/store/room";
import { formatDuration } from "@/lib/roomcast";

export default function Ended() {
  const { room, participants, reset } = useRoomStore();
  const duration = room?.startedAt && room?.endedAt ? room.endedAt - room.startedAt : 0;

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="absolute inset-0 -z-10 grid-bg opacity-50" />
      <div className="absolute -top-32 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-aurora opacity-15 blur-3xl" />

      <div className="w-full max-w-xl animate-scale-in text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <BrandLogo size="md" />
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">The room has ended</h1>
        <p className="mt-2 text-muted-foreground">Thanks for watching together. Your room is now closed.</p>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <Stat label="Room" value={room?.name ?? "-"} />
          <Stat label="Duration" value={duration ? formatDuration(duration) : "-"} mono />
          <Stat label="Watched" value={`${participants.length}`} mono />
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow" onClick={() => reset()}>
            <Link to="/home"><Home className="h-4 w-4" /> Back to dashboard</Link>
          </Button>
          <Button asChild variant="ghost" className="glass" onClick={() => reset()}>
            <Link to="/home"><RotateCcw className="h-4 w-4" /> Start a new room</Link>
          </Button>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Recording is never enabled in RoomCast. Your screen and voice are gone the moment the room closes.
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/40 p-4 text-left">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 truncate font-display text-lg font-semibold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

