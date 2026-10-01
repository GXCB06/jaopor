"use client";

// Phase 8 avatars: DiceBear "notionists" (art by Zoish, CC0 1.0; library MIT), generated locally
// from the visitor's random id. Nothing is fetched from a third party.
import { createAvatar } from "@dicebear/core";
import * as notionists from "@dicebear/notionists";

const cache = new Map<string, string>();

export function avatarUri(seed: string): string {
  let uri = cache.get(seed);
  if (!uri) {
    uri = createAvatar(notionists, {
      seed,
      size: 64,
      backgroundColor: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"],
    }).toDataUri();
    if (cache.size > 300) cache.clear();
    cache.set(seed, uri);
  }
  return uri;
}
