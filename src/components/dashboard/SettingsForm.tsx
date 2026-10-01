"use client";

import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveProfile } from "@/app/actions/profile";
import { Card } from "@/components/core/Card";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import {
  VISIBILITIES,
  VISIBILITY_FIELDS,
  type Visibility,
} from "@/lib/profile";
import { cn } from "@/lib/utils";

/** Design.md §6 Settings: per-field visibility + directory listing (Phase 9d). */
export function SettingsForm({
  initial,
}: {
  initial: { visibility: Record<string, Visibility>; showInDirectory: boolean };
}) {
  const t = useTranslations("Me");
  const router = useRouter();
  const [vis, setVis] = useState(initial.visibility);
  const [dir, setDir] = useState(initial.showInDirectory);
  const [saving, start] = useTransition();
  // Last saved values (public is stored as "no entry", so compare with this, not `initial`).
  const [saved, setSaved] = useState({
    vis: initial.visibility,
    dir: initial.showInDirectory,
  });
  const dirty =
    dir !== saved.dir || JSON.stringify(vis) !== JSON.stringify(saved.vis);

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-bold">{t("visibilityTitle")}</h2>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {t("visibilityHint")}
          </p>
        </div>
        <ul className="divide-y">
          {VISIBILITY_FIELDS.map((field) => (
            <li
              key={field}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5"
            >
              <span className="text-caption">{t(`fields.${field}`)}</span>
              <div
                role="radiogroup"
                aria-label={t(`fields.${field}`)}
                className="flex rounded-lg border p-0.5"
              >
                {VISIBILITIES.map((v) => {
                  const on = (vis[field] ?? "public") === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setVis({ ...vis, [field]: v })}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-2xs whitespace-nowrap",
                        on
                          ? "bg-secondary font-semibold text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t(`vis.${v}`)}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={dir}
            onChange={(e) => setDir(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--brand)]"
          />
          <span>
            <span className="block text-sm font-bold">
              {t("directoryTitle")}
            </span>
            <span className="block text-caption text-muted-foreground">
              {t("directoryHint")}
            </span>
          </span>
        </label>
      </Card>

      <div className="flex justify-end">
        <Button
          disabled={!dirty || saving}
          onClick={() =>
            start(async () => {
              const res = await saveProfile({
                visibility: vis,
                showInDirectory: dir,
              });
              if (res.ok) {
                setSaved({ vis, dir });
                toast.success(t("saved"));
                router.refresh();
              } else toast.error(t("saveFailed"));
            })
          }
        >
          {saving && (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          )}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
