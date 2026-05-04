import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuthStore } from "@/store/auth";
import { firebaseConfigError, isFirebaseConfigured } from "@/services/firebase";
import { toast } from "sonner";

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { isAuthed, isLoading, loginWithGoogle, error } = useAuthStore();
  const redirect = params.get("redirect") || "/home";

  useEffect(() => {
    if (isAuthed) nav(redirect, { replace: true });
  }, [isAuthed, nav, redirect]);

  const onGoogle = async () => {
    try {
      if (!isFirebaseConfigured) {
        toast.error(firebaseConfigError || "Firebase is not configured.");
        return;
      }
      await loginWithGoogle();
      toast.success("Welcome to RoomCast");
      nav(redirect, { replace: true });
    } catch {
      toast.error("Google sign-in was cancelled or failed");
    }
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
            Continue with Google to create or join private two-person rooms.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 glass p-6 shadow-elevated">
          {!isFirebaseConfigured && (
            <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              Add Firebase values to `.env` before Google sign-in will work.
            </div>
          )}
          <Button
            type="button"
            disabled={isLoading}
            onClick={onGoogle}
            className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
          >
            Continue with Google <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            Google Sign-In only. RoomCast does not store passwords.
          </div>
          {error && <div className="mt-3 text-center text-xs text-destructive">{error}</div>}
        </div>
      </div>
    </main>
  );
}
