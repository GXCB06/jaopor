import Image from "next/image";

// Design.md §5 Profile layout, cover (owner 2026-10-12): a wide banner at the top of the project
// page so each page looks like its own. The first screenshot when there is one (anonymous projects
// never have public screenshots), else a gradient in the hero blues. Decorative: the gallery
// below shows the same image with its alt text.

export function ProfileCover({ src }: { src: string | null }) {
  return (
    <div
      aria-hidden="true"
      className="relative h-32 overflow-hidden rounded-2xl border bg-card sm:h-44 lg:h-52"
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 64rem, 100vw"
          className="object-cover object-top"
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-linear-to-br from-(--hero-grad-from)/35 via-(--hero-grad-via)/12 to-(--hero-grad-to)/5" />
          <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:18px_18px] opacity-60" />
        </>
      )}
      {/* Fades into the page at the bottom, where the logo overlaps it. */}
      <div className="absolute inset-0 bg-linear-to-t from-background/60 via-transparent to-transparent" />
    </div>
  );
}
