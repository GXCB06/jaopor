"use client";

import { CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shareLinks } from "@/lib/share";
import { copy, type ShareData } from "./ShareMenu";

// Design.md §9 post-verify / post-listing moment: the main share trigger. Opens when the wizard
// lands on the profile with ?new=1 or ?verified=1, with a ready-to-paste post for the
// Claude Thailand "อวดโปรเจค" thread (the growth loop from docs/research §3).

const noop = () => () => {};

export function ShareDialog({
  data,
  post,
  ogImage,
  badgeSrc,
}: {
  data: ShareData;
  /** Full post text (name, tagline, verified numbers, link). */
  post: string;
  ogImage: string;
  badgeSrc: string;
}) {
  const t = useTranslations("Share");
  // Read the query client-side so the profile page stays ISR-cached.
  const search = useSyncExternalStore(
    noop,
    () => window.location.search,
    () => "",
  );
  const params = new URLSearchParams(search);
  const mode = params.has("verified")
    ? "verified"
    : params.has("new")
      ? "new"
      : null;
  const [dismissed, setDismissed] = useState(false);
  const links = shareLinks(data.url, data.text);

  function close() {
    setDismissed(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("new");
    url.searchParams.delete("verified");
    window.history.replaceState(null, "", url);
  }

  return (
    <Dialog
      open={mode !== null && !dismissed}
      onOpenChange={(o) => !o && close()}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "verified" ? t("titleVerified") : t("titleNew")}
          </DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        {/* eslint-disable-next-line @next/next/no-img-element -- our own OG route, already sized */}
        <img
          src={ogImage}
          alt=""
          width={1200}
          height={630}
          className="aspect-[1200/630] w-full rounded-lg border"
        />
        <pre className="rounded-lg border bg-muted/40 p-3 font-sans text-xs whitespace-pre-wrap">
          {post}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => copy(post, t("postCopied"))}>
            <CopyIcon />
            {t("copyPost")}
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={links.facebook} target="_blank" rel="noopener noreferrer">
              {t("facebook")}
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={links.line} target="_blank" rel="noopener noreferrer">
              {t("line")}
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => copy(data.url, t("linkCopied"))}
          >
            {t("copyLink")}
          </Button>
        </div>
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-semibold">{t("badgeTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("badgeBody")}</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG badge from our API */}
          <img src={badgeSrc} alt="" height={28} className="h-7 w-auto" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => copy(data.badgeHtml, t("badgeCopied"))}
          >
            {t("copyBadge")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
