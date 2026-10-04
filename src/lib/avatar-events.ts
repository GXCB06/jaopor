// Browser-only: tells the header (a client widget that loads the photo once) that the signed-in
// user's photo just changed, so it updates without a reload. Sent by the profile editor only after
// the server confirmed the change; carries the URL now stored (null = initials).

const EVENT = "jaopor:avatar-changed";

export function announceAvatar(url: string | null): void {
  window.dispatchEvent(new CustomEvent<string | null>(EVENT, { detail: url }));
}

export function onAvatarChange(cb: (url: string | null) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<string | null>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
