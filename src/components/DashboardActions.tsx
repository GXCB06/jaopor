"use client";

import {
  LinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useRouter } from "@/i18n/navigation";
import type { SourceId } from "@/lib/sources/catalog";
import { useConfirm } from "@/components/core/useConfirm";
import { createClient } from "@/lib/supabase/client";

/** Design.md §5 Dashboard startup card: ONE primary action + an overflow "⋯" menu. */
export function DashboardActions({
  id,
  slug,
  name,
  refreshSource,
  verified,
}: {
  id: number;
  slug: string;
  name: string;
  /** Source re-synced by "Refresh" (null = nothing connected). */
  refreshSource: SourceId | null;
  verified: boolean;
}) {
  const t = useTranslations("Dashboard");
  const errors = useTranslations("Errors");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    const res = await fetch(`/api/startups/${id}/sources/${refreshSource}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (res.ok) {
      toast.success(t("refreshed"));
      router.refresh();
    } else {
      const code = body.error ?? "server";
      toast.error(
        errors.has(code)
          ? errors(code as "server", {
              source: refreshSource ?? "",
              detail: "",
            })
          : errors("server"),
      );
    }
  }

  const [confirm, confirmDialog] = useConfirm();

  async function copyLink() {
    await navigator.clipboard.writeText(
      new URL(`/startup/${slug}`, window.location.origin).toString(),
    );
    toast.success(t("linkCopied"));
  }

  async function remove() {
    const ok = await confirm({
      title: t("deleteTitle", { name }),
      body: t("deleteConfirm", { name }),
      confirmLabel: t("delete"),
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    const db = createClient();
    // Storage can't cascade from SQL: remove the project's screenshot files first (the owner's
    // storage policies allow it), then the row (screenshot rows cascade). A storage hiccup must
    // not block deleting the project.
    try {
      const { data: files } = await db.storage
        .from("screenshots")
        .list(String(id), { limit: 100 });
      if (files?.length)
        await db.storage
          .from("screenshots")
          .remove(files.map((f) => `${id}/${f.name}`));
    } catch {
      // ignore
    }
    const { error } = await db.from("startups").delete().eq("id", id);
    setBusy(false);
    if (error) return toast.error(errors("server"));
    toast.success(t("deleted"));
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {confirmDialog}
      {verified ? (
        <Button asChild size="sm" className="px-4">
          <Link href={`/startup/${slug}`}>{t("viewProfile")}</Link>
        </Button>
      ) : (
        <Button asChild size="sm" className="px-4">
          <Link href={`/dashboard/${id}/edit#verify`}>{t("connect")}</Link>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={t("more")}
            disabled={busy}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {!verified && (
            <DropdownMenuItem asChild>
              <Link href={`/startup/${slug}`}>{t("viewProfile")}</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/${id}/edit`}>
              <PencilIcon />
              {t("edit")}
            </Link>
          </DropdownMenuItem>
          {refreshSource && (
            <DropdownMenuItem onSelect={refresh}>
              <RefreshCwIcon />
              {t("refresh")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={copyLink}>
            <LinkIcon />
            {t("copyLink")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={remove}>
            <Trash2Icon />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
