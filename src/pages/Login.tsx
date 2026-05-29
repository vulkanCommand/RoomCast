import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuthStore } from "@/store/auth";
import { firebaseConfigError, isFirebaseConfigured } from "@/services/firebase";
import { canUseQaTools, enableQaMode, qaTestUsers } from "@/lib/qa";
import { toast } from "sonner";

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { isAuthed, isLoading, loginWithGoogle, loginWithEmailPassword, error } = useAuthStore();
  const redirect = params.get("redirect") || "/home";
  const qaRequested = params.get("qa") === "1";
  const showQaAuth = canUseQaTools();

  useEffect(() => {
    if (isAuthed) nav(redirect, { replace: true });
  }, [isAuthed, nav, redirect]);

  useEffect(() => {
    if (qaRequested) enableQaMode();
  }, [qaRequested]);

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

  const onQaLogin = async (email: string, password: string) => {
    try {
      enableQaMode();
      await loginWithEmailPassword(email, password);
      toast.success("Signed in for local QA");
      nav(redirect, { replace: true });
    } catch {
      toast.error("QA sign-in failed");
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
            data-testid="login-google"
          >
            Continue with Google <ArrowRight className="h-4 w-4" />
          </Button>

          {showQaAuth && (
            <div className="mt-4 rounded-xl border border-border/70 bg-background/30 p-4">
              <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Local QA only
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  data-testid="qa-login-host"
                  onClick={() => onQaLogin(qaTestUsers.host.email, qaTestUsers.host.password)}
                >
                  QA host
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  data-testid="qa-login-guest"
                  onClick={() => onQaLogin(qaTestUsers.guest.email, qaTestUsers.guest.password)}
                >
                  QA guest
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Uses local env-provided QA users and fake media streams when QA mode is enabled.
              </p>
            </div>
          )}

          <div className="mt-5 text-center text-xs text-muted-foreground">
            Google Sign-In only. RoomCast does not store passwords.
          </div>
          {error && <div className="mt-3 text-center text-xs text-destructive">{error}</div>}
        </div>
      </div>
    </main>
  );
}
