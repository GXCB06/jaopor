import { useTranslations } from "next-intl";
import { BRAND_ICONS, type BrandIconId } from "@/lib/brand-icons";
import { cn } from "@/lib/utils";

// Design.md §5 ProviderStrip — "Numbers verified by:" + the real provider logos (Simple Icons, CC0).
// LIVE mirrors the sources catalog (src/lib/sources/catalog.ts); move an entry from UPCOMING when its
// connector ships (/add-payment-provider).
type Item = { id: BrandIconId | "polar"; name: string };

const LIVE: Item[] = [
  { id: "stripe", name: "Stripe" },
  { id: "revenuecat", name: "RevenueCat" },
  { id: "plausible", name: "Plausible" },
  { id: "umami", name: "Umami" },
  { id: "cloudflare", name: "Cloudflare" },
  { id: "github", name: "GitHub" },
];
const UPCOMING: Item[] = [
  { id: "polar", name: "Polar" },
  { id: "lemonsqueezy", name: "Lemon Squeezy" },
  { id: "paddle", name: "Paddle" },
  { id: "appstore", name: "App Store" },
];

function Tile({
  item,
  soon,
  label,
}: {
  item: Item;
  soon: boolean;
  label: string;
}) {
  const icon = item.id === "polar" ? null : BRAND_ICONS[item.id];
  return (
    <li className="group relative">
      <span
        tabIndex={0}
        aria-label={label}
        // Brand colours come from the logo data (Design.md §5 ProviderStrip exception).
        style={icon ? { backgroundColor: icon.bg } : undefined}
        className={cn(
          "flex size-8 items-center justify-center rounded-lg ring-1 ring-border outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !icon && "bg-foreground text-sm font-bold text-background",
          soon && "opacity-40",
        )}
      >
        {icon ? (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-4"
            style={{ fill: icon.fg }}
          >
            <path d={icon.path} />
          </svg>
        ) : (
          <span aria-hidden="true">{item.name.slice(0, 1)}</span>
        )}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground group-focus-within:block group-hover:block"
      >
        {label}
      </span>
    </li>
  );
}

export function ProviderStrip() {
  const t = useTranslations("Home");
  return (
    <div className="flex flex-col items-center gap-2.5">
      <p className="text-caption text-muted-foreground">{t("verifiedBy")}</p>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {LIVE.map((p) => (
          <Tile key={p.id} item={p} soon={false} label={p.name} />
        ))}
        {UPCOMING.map((p) => (
          <Tile
            key={p.id}
            item={p}
            soon
            label={`${p.name} · ${t("comingSoon")}`}
          />
        ))}
      </ul>
    </div>
  );
}
