"use client";

import { CodeIcon, LinkIcon, Share2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shareLinks } from "@/lib/share";

export type ShareData = {
  url: string;
  /** Short text for X / native share. */
  text: string;
  badgeHtml: string;
};

const noop = () => () => {};

export async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    // Clipboard blocked (permissions / insecure context): nothing else to do.
  }
}

/** Design.md §9 share menu: native share (mobile), copy link, Facebook, LINE, X, badge HTML. */
export function ShareMenu({ data }: { data: ShareData }) {
  const t = useTranslations("Share");
  const links = shareLinks(data.url, data.text);
  // Server renders without it; phones get the native sheet after hydration (no mismatch).
  const canShare = useSyncExternalStore(
    noop,
    () => "share" in navigator,
    () => false,
  );
  const open = (href: string) =>
    window.open(href, "_blank", "noopener,noreferrer,width=640,height=640");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Share2Icon />
          {t("share")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {canShare && (
          <DropdownMenuItem
            onSelect={() =>
              navigator
                .share({ url: data.url, text: data.text })
                .catch(() => {})
            }
          >
            <Share2Icon />
            {t("nativeShare")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => copy(data.url, t("linkCopied"))}>
          <LinkIcon />
          {t("copyLink")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open(links.facebook)}>
          {t("facebook")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open(links.line)}>
          {t("line")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open(links.x)}>
          {t("x")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => copy(data.badgeHtml, t("badgeCopied"))}
        >
          <CodeIcon />
          {t("copyBadge")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
