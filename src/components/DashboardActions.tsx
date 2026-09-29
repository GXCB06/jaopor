"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function DashboardActions({
  id,
  slug,
  name,
  connected,
}: {
  id: number;
  slug: string;
  name: string;
  connected: boolean;
}) {
  const t = useTranslations("Dashboard");
  const errors = useTranslations("Errors");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    const res = await fetch(`/api/startups/${id}/stripe`, {
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
        errors.has(code) ? errors(code as "server") : errors("server"),
      );
    }
  }

  async function remove() {
    if (!window.confirm(t("deleteConfirm", { name }))) return;
    setBusy(true);
    const { error } = await createClient()
      .from("startups")
      .delete()
      .eq("id", id);
    setBusy(false);
    if (error) return toast.error(errors("server"));
    toast.success(t("deleted"));
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/startup/${slug}`}>{t("view")}</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/dashboard/${id}/edit`}>{t("edit")}</Link>
      </Button>
      {connected ? (
        <Button size="sm" variant="outline" onClick={refresh} disabled={busy}>
          {t("refresh")}
        </Button>
      ) : (
        <Button asChild size="sm">
          <Link
            href={{
              pathname: `/dashboard/${id}/edit`,
              query: { step: "revenue" },
            }}
          >
            {t("connect")}
          </Link>
        </Button>
      )}
      <Button size="sm" variant="destructive" onClick={remove} disabled={busy}>
        {t("delete")}
      </Button>
    </div>
  );
}
