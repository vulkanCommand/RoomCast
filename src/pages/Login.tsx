import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, User as UserIcon, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";

export default function Login() {
  const nav = useNavigate();
  const { signIn } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    signIn(name.trim(), email.trim() || undefined);
    toast.success(`Welcome, ${name.split(" ")[0]}`);
    nav("/home");
  };

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="absolute inset-0 -z-10 grid-bg opacity-60" />
      <div className="absolute -top-20 left-1/2 -z-10 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-aurora opacity-20 blur-3xl" />

      <div className="w-full max-w-md animate-scale-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size="lg" />
          <h1 className="mt-6 font-display text-3xl font-semibold">Sign in to RoomCast</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            No password yet — this is a frontend preview.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border/70 glass p-6 shadow-elevated"
        >
          <div className="space-y-4">
            <Field label="Display name" icon={<UserIcon className="h-4 w-4" />}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ava Chen"
                className="bg-background/40"
                autoFocus
              />
            </Field>
            <Field label="Email (optional)" icon={<Mail className="h-4 w-4" />}>
              <Input
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ava@roomcast.app"
                className="bg-background/40"
              />
            </Field>
          </div>

          <Button type="submit" className="mt-6 w-full bg-gradient-primary text-primary-foreground shadow-glow">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            Firebase Auth, Google sign-in, and email magic links connect later.
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}
