import { Link, NavLink, useLocation } from "react-router-dom";
import { LogOut, Plus } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { useAuthStore } from "@/store/auth";
import { AvatarOrb } from "./AvatarOrb";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { user, isAuthed, signOut } = useAuthStore();
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
                <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
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
