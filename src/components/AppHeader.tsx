import { Link, NavLink, useLocation } from "react-router-dom";
import { LifeBuoy, LogOut, Mail, Plus } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { useAuthStore } from "@/store/auth";
import { AvatarOrb } from "./AvatarOrb";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { cn } from "@/lib/utils";

const SUPPORT_EMAIL = "gdkalyan2109@gmail.com";

function SupportButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" aria-label="Contact support">
          <LifeBuoy className="h-4 w-4" />
          <span className="hidden sm:inline">Support</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Contact the developer</DialogTitle>
          <DialogDescription>
            Need help, found a bug, or have feedback about RoomCast? Reach out directly.
          </DialogDescription>
        </DialogHeader>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=RoomCast%20Support`}
          className="mt-2 flex items-center gap-3 rounded-xl border border-border/70 bg-card/50 p-4 transition-colors hover:border-primary/50 hover:bg-card"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Email</div>
            <div className="truncate font-mono text-sm font-medium">{SUPPORT_EMAIL}</div>
          </div>
        </a>
        <p className="text-xs text-muted-foreground">
          We typically respond within 1–2 business days.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function AppHeader() {
  const { user, isAuthed, logout } = useAuthStore();
  const loc = useLocation();
  const inRoom = loc.pathname.startsWith("/room/");
  if (inRoom) return null;

  return (
    <header className="sticky top-0 z-40">
      <div className="glass border-b border-border/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to={isAuthed ? "/home" : "/"} className="flex items-center">
            <BrandLogo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {isAuthed && (
              <>
                <HeaderLink to="/home">Home</HeaderLink>
                <HeaderLink to="/join">Join</HeaderLink>
              </>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {isAuthed ? (
              <>
                <Button asChild size="sm" className="hidden bg-gradient-primary text-primary-foreground sm:inline-flex">
                  <Link to="/home">
                    <Plus className="h-4 w-4" /> New room
                  </Link>
                </Button>
                {user && <AvatarOrb initials={user.initials} hue={user.avatarColor} size="sm" />}
                <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
          isActive && "bg-secondary text-foreground",
        )
      }
    >
      {children}
    </NavLink>
  );
}
