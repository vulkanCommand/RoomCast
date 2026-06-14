export function buildRoomInviteUrl(roomId: string, options?: { baseUrl?: string; origin?: string }) {
  const configuredBase = options?.baseUrl?.trim();
  const origin =
    configuredBase ||
    options?.origin ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (!origin) return `/room/${roomId}`;
  return new URL(`/room/${roomId}`, origin.endsWith("/") ? origin : `${origin}/`).toString();
}
