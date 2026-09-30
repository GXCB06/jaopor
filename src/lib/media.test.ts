import { describe, expect, it } from "vitest";
import { detectKind, fitWithin, videoEmbed } from "./media";

describe("videoEmbed", () => {
  it("turns supported links into embeds", () => {
    expect(
      videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.embedUrl,
    ).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1");
    expect(videoEmbed("https://youtu.be/dQw4w9WgXcQ")?.provider).toBe(
      "youtube",
    );
    expect(
      videoEmbed("https://youtube.com/shorts/abcDEF12345")?.embedUrl,
    ).toContain("/embed/abcDEF12345");
    expect(
      videoEmbed("https://www.loom.com/share/0123456789abcdef")?.embedUrl,
    ).toBe("https://www.loom.com/embed/0123456789abcdef?autoplay=1");
    expect(
      videoEmbed("https://www.tiktok.com/@jaopor.dev/video/7311111111111111111")
        ?.embedUrl,
    ).toBe("https://www.tiktok.com/embed/v2/7311111111111111111");
  });

  it("rejects anything else", () => {
    expect(videoEmbed("https://vimeo.com/123")).toBeNull();
    expect(videoEmbed("http://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(
      videoEmbed("https://evil.com/?u=https://youtu.be/dQw4w9WgXcQ"),
    ).toBeNull();
    expect(videoEmbed("https://www.youtube.com/watch?v=<script>")).toBeNull();
    expect(videoEmbed(null)).toBeNull();
  });
});

describe("screenshot helpers", () => {
  it("detects the kind from the aspect ratio", () => {
    expect(detectKind(1600, 1000)).toBe("desktop");
    expect(detectKind(1170, 2532)).toBe("mobile");
    expect(detectKind(1000, 1000)).toBe("mobile");
  });

  it("caps the long side at 2400px", () => {
    expect(fitWithin(4800, 3000)).toEqual({ width: 2400, height: 1500 });
    expect(fitWithin(1170, 2532)).toEqual({ width: 1109, height: 2400 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
