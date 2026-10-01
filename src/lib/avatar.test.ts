import { describe, expect, it } from "vitest";
import {
  PROVIDER_PHOTO,
  avatarType,
  ownAvatarFile,
  ownAvatarPath,
  providerPhoto,
} from "./avatar";

const bytes = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
const A = "0b6f3c1e-5d1a-4c55-9a8e-3f1b2c4d5e6f";
const B = "1c7a4d2f-6e2b-4d66-8b9f-4a2c3d5e6f70";
const F = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";
const base =
  "https://letfxefyqxxrfujpwtri.supabase.co/storage/v1/object/public/avatars/";

describe("avatarType (server decides by bytes)", () => {
  it("accepts WebP and JPEG signatures only", () => {
    expect(avatarType(bytes("RIFF\u0000\u0000\u0000\u0000WEBPVP8 "))).toBe(
      "webp",
    );
    expect(avatarType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(avatarType(bytes("\u0089PNG\r\n\u001a\n...."))).toBeNull(); // PNG never stored
    expect(avatarType(bytes("<svg xmlns="))).toBeNull();
    expect(avatarType(bytes("GIF89a......"))).toBeNull();
    expect(avatarType(bytes("RIFF"))).toBeNull();
  });
});

describe("own-folder paths (mirror of the cleanup trigger)", () => {
  it("only this user's folder, uuid file names, webp / jpg", () => {
    expect(ownAvatarPath(`${base}${A}/${F}.webp`, A)).toBe(`${A}/${F}.webp`);
    expect(ownAvatarPath(`${base}${A}/${F}.jpg`, A)).toBe(`${A}/${F}.jpg`);
    expect(ownAvatarPath(`${base}${B}/${F}.webp`, A)).toBeNull(); // someone else's
    expect(ownAvatarPath(`${base}${A}/${F}.svg`, A)).toBeNull();
    expect(ownAvatarPath(`${base}${A}/../${B}/${F}.webp`, A)).toBeNull();
    expect(ownAvatarPath(`${base}${A}/${F}.webp?x=1`, A)).toBeNull();
    expect(
      ownAvatarPath("https://avatars.githubusercontent.com/u/1?v=4", A),
    ).toBeNull();
    expect(ownAvatarPath(null, A)).toBeNull();
    expect(ownAvatarFile(`${A}/${F}.webp`, "not-a-uuid")).toBeNull();
  });
});

describe("providerPhoto (never from user-editable metadata)", () => {
  const google = "https://lh3.googleusercontent.com/a/ACg8ocK=s96-c";
  const github = "https://avatars.githubusercontent.com/u/123?v=4";
  it("reads the identity of the last sign-in provider first", () => {
    expect(
      providerPhoto({
        app_metadata: { provider: "github" },
        identities: [
          { provider: "google", identity_data: { avatar_url: google } },
          { provider: "github", identity_data: { avatar_url: github } },
        ],
      }),
    ).toBe(github);
  });
  it("ignores user_metadata and hosts other than Google / GitHub", () => {
    const evil = {
      user_metadata: { avatar_url: google },
      identities: [
        {
          provider: "google",
          identity_data: { avatar_url: "https://evil.example/p.gif" },
        },
      ],
    };
    expect(providerPhoto(evil)).toBeNull();
    expect(
      providerPhoto({
        identities: [
          {
            provider: "google",
            identity_data: {
              avatar_url: `${base}${B}/${F}.webp`, // look-alike of our bucket
            },
          },
        ],
      }),
    ).toBeNull();
    expect(providerPhoto(null)).toBeNull();
  });
  it("matches the database rule", () => {
    expect(PROVIDER_PHOTO.test(google)).toBe(true);
    expect(PROVIDER_PHOTO.test(github)).toBe(true);
    expect(
      PROVIDER_PHOTO.test("https://lh3.googleusercontent.com.evil.example/a"),
    ).toBe(false);
    expect(
      PROVIDER_PHOTO.test("http://avatars.githubusercontent.com/u/1"),
    ).toBe(false);
    expect(
      PROVIDER_PHOTO.test("https://avatars.githubusercontent.com/u/1 x"),
    ).toBe(false);
  });
});
