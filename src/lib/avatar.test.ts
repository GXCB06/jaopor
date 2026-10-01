import { describe, expect, it } from "vitest";
import { avatarPath, avatarType, providerAvatar } from "./avatar";

const bytes = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
const id = "0b6f3c1e-5d1a-4c55-9a8e-3f1b2c4d5e6f";
const file = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

describe("avatar", () => {
  it("recognises WebP and JPEG by their first bytes", () => {
    expect(avatarType(bytes("RIFF\u0000\u0000\u0000\u0000WEBPVP8 "))).toBe(
      "webp",
    );
    expect(avatarType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(avatarType(bytes("\u0089PNG\r\n\u001a\n...."))).toBeNull();
    expect(avatarType(bytes("RIFF"))).toBeNull();
  });

  it("only treats files in our bucket as ours", () => {
    const ours = `https://x.supabase.co/storage/v1/object/public/avatars/${id}/${file}.webp`;
    expect(avatarPath(ours)).toBe(`${id}/${file}.webp`);
    expect(avatarPath(ours.replace(".webp", ".jpg"))).toBe(`${id}/${file}.jpg`);
    expect(avatarPath(ours.replace(".webp", ".svg"))).toBeNull();
    expect(
      avatarPath("https://avatars.githubusercontent.com/u/1?v=4"),
    ).toBeNull();
    expect(
      avatarPath(
        `https://x.supabase.co/storage/v1/object/public/avatars/${id}/../x.webp`,
      ),
    ).toBeNull();
    expect(avatarPath(null)).toBeNull();
  });

  it("accepts only https sign-in photos", () => {
    expect(
      providerAvatar({ avatar_url: "https://lh3.googleusercontent.com/a" }),
    ).toBe("https://lh3.googleusercontent.com/a");
    expect(providerAvatar({ avatar_url: "http://x" })).toBeNull();
    expect(providerAvatar({ avatar_url: 1 })).toBeNull();
    expect(providerAvatar(null)).toBeNull();
  });
});
