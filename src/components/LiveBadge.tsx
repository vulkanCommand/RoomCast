import { cn } from "@/lib/utils";

export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-live",
        className,
      )}
    >
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
      </span>
      Live
    </span>
  );
}
