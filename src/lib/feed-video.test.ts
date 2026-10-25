import { describe, expect, it } from "vitest";
import { feedVideoEmbed } from "./media";

describe("feedVideoEmbed", () => {
  it("plays YouTube watch, youtu.be, Shorts (vertical) and Live links", () => {
    expect(
      feedVideoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toEqual({
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
      vertical: false,
    });
    expect(feedVideoEmbed("https://youtu.be/dQw4w9WgXcQ")?.provider).toBe(
      "youtube",
    );
    expect(
      feedVideoEmbed("https://m.youtube.com/shorts/abcDEF12345")?.vertical,
    ).toBe(true);
    expect(
      feedVideoEmbed("https://www.youtube.com/live/abcDEF12345")?.embedUrl,
    ).toContain("/embed/abcDEF12345");
  });

  it("plays TikTok videos vertically, only with a numeric id", () => {
    expect(
      feedVideoEmbed(
        "https://www.tiktok.com/@jaopor.dev/video/7412345678901234567",
      ),
    ).toEqual({
      provider: "tiktok",
      embedUrl: "https://www.tiktok.com/embed/v2/7412345678901234567",
      vertical: true,
    });
    expect(feedVideoEmbed("https://www.tiktok.com/@jaopor.dev")).toBeNull();
  });

  it("plays Facebook videos, watch links and Reels through the video plugin", () => {
    const v = feedVideoEmbed(
      "https://www.facebook.com/jaopor/videos/1234567890123/",
    );
    expect(v?.provider).toBe("facebook");
    expect(v?.vertical).toBe(false);
    expect(decodeURIComponent(v!.embedUrl)).toContain(
      "href=https://www.facebook.com/jaopor/videos/1234567890123/",
    );
    expect(
      feedVideoEmbed("https://www.facebook.com/reel/1234567890123")?.vertical,
    ).toBe(true);
    expect(
      feedVideoEmbed("https://www.facebook.com/watch/?v=1234567890123")
        ?.provider,
    ).toBe("facebook");
    expect(feedVideoEmbed("https://www.facebook.com/jaopor")).toBeNull();
  });

  it("leaves other links, http and junk as link cards", () => {
    for (const bad of [
      "https://jaopor.vercel.app",
      "http://youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=<script>",
      "not a url",
      "",
      null,
    ])
      expect(feedVideoEmbed(bad), String(bad)).toBeNull();
  });
});
