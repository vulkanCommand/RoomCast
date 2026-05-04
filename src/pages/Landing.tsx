import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, MonitorPlay, Mic, Lock, Sparkles, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { LiveBadge } from "@/components/LiveBadge";
import { useAuthStore } from "@/store/auth";

export default function Landing() {
  const nav = useNavigate();
  const { isAuthed } = useAuthStore();

  return (
    <main className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
        <div className="container relative pb-24 pt-20 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground animate-fade-in">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Now in private beta - WebRTC-grade latency
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl animate-fade-in-up">
              Private watch rooms with{" "}
              <span className="text-gradient">live push-to-talk voice.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-in-up">
              RoomCast turns any browser tab into a cinematic shared screening. Invite friends with a code,
              share your screen, and hold the spacebar to speak like you're in the same room.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-gradient-primary text-primary-foreground shadow-elevated"
                onClick={() => nav(isAuthed ? "/home" : "/login")}
              >
                {isAuthed ? "Open dashboard" : "Get started"} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button asChild size="lg" variant="ghost" className="glass">
                <Link to="/join">I have a room code</Link>
              </Button>
            </div>
          </div>

          {/* Cinematic preview */}
          <div className="relative mx-auto mt-20 max-w-5xl animate-scale-in">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-aurora opacity-25 blur-3xl" />
            <div className="overflow-hidden rounded-2xl border border-border/80 glass shadow-elevated">
              <div className="flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-destructive/70" />
                  <span className="h-3 w-3 rounded-full bg-warning/70" />
                  <span className="h-3 w-3 rounded-full bg-success/70" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BrandLogo size="sm" showWordmark={false} />
                  <span className="font-mono">roomcast.app/r/MOVIE7</span>
                </div>
                <LiveBadge />
              </div>
              <div className="relative aspect-[16/9] bg-gradient-to-br from-[#1a1638] via-[#0c0c1a] to-[#0a0f1a]">
                <div className="absolute inset-0 grid-bg opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="rounded-2xl bg-gradient-primary p-5 shadow-glow animate-float-slow">
                      <MonitorPlay className="h-10 w-10 text-primary-foreground" />
                    </div>
                    <p className="font-display text-xl">Ava is sharing her screen</p>
                    <p className="text-sm text-muted-foreground">Host and guest - voice channel open</p>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {["AC", "ML", "PS", "DA"].map((i, idx) => (
                      <div
                        key={i}
                        className="h-9 w-9 rounded-full border-2 border-background ring-1 ring-border"
                        style={{
                          background: `linear-gradient(135deg, hsl(${idx * 80} 90% 62%), hsl(${idx * 80 + 40} 90% 55%))`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
                    <Mic className="h-3.5 w-3.5 text-primary" />
                    <span>Hold Space to talk</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container pb-28">
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            icon={<MonitorPlay className="h-5 w-5" />}
            title="Cinematic screen sharing"
            body="WebRTC-grade screen sharing with adaptive bitrate. Anything in your tab, streamed crisply to your room."
          />
          <Feature
            icon={<Mic className="h-5 w-5" />}
            title="Push-to-talk voice"
            body="Hold the spacebar to speak. Audio ducks the share volume from 100% to 25% so everyone can hear."
          />
          <Feature
            icon={<Lock className="h-5 w-5" />}
            title="Private by default"
            body="Rooms are invite-only with a 6-character code. Nothing is recorded. Nothing is public."
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Sub-second latency"
            body="Direct peer connections keep voice and screen tightly in sync, even across continents."
          />
          <Feature
            icon={<Users className="h-5 w-5" />}
            title="One host, one guest"
            body="The MVP is built for two-person private rooms: a host shares, a guest watches, and both can talk."
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="Designed to feel premium"
            body="Cinematic dark UI built for evenings, with motion, glow, and tactile controls everywhere it matters."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 p-10 text-center shadow-elevated glass">
          <div className="absolute inset-0 -z-10 bg-gradient-aurora opacity-15" />
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Your next watch party starts in seconds.</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Sign in, spin up a room, and send the code. RoomCast handles the rest.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground">
              <Link to={isAuthed ? "/home" : "/login"}>Create a room <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="glass">
              <Link to="/join">Join with code</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="container flex flex-col items-center justify-between gap-3 py-8 text-xs text-muted-foreground sm:flex-row">
          <BrandLogo size="sm" />
          <span>Copyright {new Date().getFullYear()} RoomCast - Private watch rooms.</span>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="group relative rounded-2xl border border-border/70 bg-card/40 p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

