import { Monitor, Smartphone } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store/auth";
import { Button } from "./ui/button";
import { BrandLogo } from "./BrandLogo";

export function DesktopOnlyGate({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { isAuthed, logout } = useAuthStore();

  if (!isAuthed || !isMobile) return <>{children}</>;

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-5 py-10">
      <div className="absolute inset-0 grid-bg opacity-50" aria-hidden />
      <div className="absolute -inset-10 -z-10 bg-gradient-aurora opacity-15 blur-3xl" />
      <div className="relative w-full max-w-md rounded-3xl border border-border/70 glass p-7 text-center shadow-elevated">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Monitor className="h-8 w-8 text-primary-foreground" />
        </div>
        <BrandLogo size="sm" />
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">
          Desktop only experience
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This feature only works in desktop, not in mobile devices. RoomCast relies on
          WebRTC screen sharing and push-to-talk voice that browsers only fully support
          on desktop.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 rounded-full bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground">
          <Smartphone className="h-3.5 w-3.5" />
          Open RoomCast on your laptop or desktop browser to continue.
        </div>
        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={() => void logout()}
        >
          Sign out
        </Button>
      </div>
    </main>
  );
}
