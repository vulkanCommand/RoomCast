import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { useRoomStore } from "@/store/room";
import { toast } from "sonner";

export default function Join() {
  const nav = useNavigate();
  const { user } = useAuthStore();
  const { joinRoomByCode } = useRoomStore();
  const [code, setCode] = useState<string[]>(Array(6).fill(""));

  const setChar = (i: number, v: string) => {
    const ch = v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 1);
    const next = [...code];
    next[i] = ch;
    setCode(next);
    if (ch && i < 5) {
      const el = document.getElementById(`c-${i + 1}`) as HTMLInputElement | null;
      el?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const txt = e.clipboardData.getData("text").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    if (!txt) return;
    e.preventDefault();
    const next = Array(6).fill("");
    for (let i = 0; i < txt.length; i++) next[i] = txt[i];
    setCode(next);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const full = code.join("");
    if (full.length !== 6) {
      toast.error("Enter the full 6-character code");
      return;
    }
    if (!user) return;
    try {
      const room = await joinRoomByCode(full, user);
      if (!room) return;
      toast.success(`Joining ${room.name}`);
      nav(`/room/${room.id}`);
    } catch {
      toast.error("Could not join that room.");
    }
  };

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="absolute inset-0 -z-10 grid-bg opacity-60" />
      <div className="w-full max-w-xl animate-scale-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <KeyRound className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-semibold">Join a room</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter the 6-character invite code from your host.</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border border-border/70 glass p-8 shadow-elevated"
        >
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={onPaste}>
            {code.map((ch, i) => (
              <input
                id={`c-${i}`}
                key={i}
                value={ch}
                onChange={(e) => setChar(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !ch && i > 0) {
                    const el = document.getElementById(`c-${i - 1}`) as HTMLInputElement | null;
                    el?.focus();
                  }
                }}
                inputMode="text"
                autoCapitalize="characters"
                maxLength={1}
                className="h-14 w-12 rounded-xl border border-border bg-background/40 text-center font-mono text-2xl font-semibold uppercase tracking-widest outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/40 sm:h-16 sm:w-14"
              />
            ))}
          </div>

          <Button type="submit" className="mt-8 w-full bg-gradient-primary text-primary-foreground shadow-glow">
            Join room <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Codes are case-insensitive. Paste anywhere in the row.
          </p>
        </form>
      </div>
    </main>
  );
}
