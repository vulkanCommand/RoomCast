import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}

export function BrandLogo({ className, showWordmark = true, size = "md" }: BrandLogoProps) {
  const dims = size === "lg" ? 36 : size === "sm" ? 22 : 28;
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative">
        <svg width={dims} height={dims} viewBox="0 0 64 64" fill="none" aria-hidden>
          <defs>
            <linearGradient id="rc-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="hsl(var(--primary))" />
              <stop offset="0.5" stopColor="hsl(var(--accent-pink))" />
              <stop offset="1" stopColor="hsl(var(--accent-cyan))" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="60" height="60" rx="16" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
          <circle cx="32" cy="32" r="18" stroke="url(#rc-grad)" strokeWidth="3.5" />
          <circle cx="32" cy="32" r="6" fill="url(#rc-grad)" />
        </svg>
        <span className="absolute -inset-1 rounded-2xl blur-xl opacity-30 bg-gradient-aurora -z-10" />
      </div>
      {showWordmark && (
        <span
          className={cn(
            "font-display font-semibold tracking-tight",
            size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg",
          )}
        >
          Room<span className="text-gradient">Cast</span>
        </span>
      )}
    </div>
  );
}
