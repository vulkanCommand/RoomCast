import { cn } from "@/lib/utils";

interface AvatarOrbProps {
  initials: string;
  hue: string;
  speaking?: boolean;
  muted?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

export function AvatarOrb({ initials, hue, speaking, size = "md", className }: AvatarOrbProps) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full font-semibold text-white shadow-soft transition-all",
        sizeMap[size],
        speaking && "ring-2 ring-offset-2 ring-offset-background",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 90% 62%), hsl(${(parseInt(hue) + 40) % 360} 90% 55%))`,
        boxShadow: speaking ? `0 0 0 3px hsl(${hue} 90% 62% / 0.45), 0 0 30px hsl(${hue} 90% 62% / 0.6)` : undefined,
      }}
      aria-label={initials}
    >
      {initials}
    </div>
  );
}
