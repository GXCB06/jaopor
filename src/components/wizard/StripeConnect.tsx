"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { moneyFull } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Field, inputClass } from "./fields";

// Stripe's restricted-key creation pages. (Stripe removed permission-prefill query params,
// so we can only deep-link to the form and explain the two permissions.)
const STRIPE_KEY_URL = "https://dashboard.stripe.com/apikeys/create";
const STRIPE_TEST_KEY_URL = "https://dashboard.stripe.com/test/apikeys/create";

export type Verified = { mrr: number; revenue: number };

/** Paste-a-read-only-key form used by the add flow and the edit page. */
export function StripeConnect({
  startupId,
  onVerified,
}: {
  startupId: number;
  onVerified: (v: Verified) => void;
}) {
  const t = useTranslations("Wizard");
  const errors = useTranslations("Errors");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<Verified | null>(null);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/startups/${startupId}/stripe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        detail?: string;
        metrics?: { mrrCents: number; revenue30dCents: number };
      };
      if (res.ok && body.ok && body.metrics) {
        const v = {
          mrr: body.metrics.mrrCents,
          revenue: body.metrics.revenue30dCents,
        };
        setKey("");
        setVerified(v);
        onVerified(v);
      } else if (body.error === "not_read_only" && body.detail) {
        setError(t("writeAccessOn", { resources: body.detail }));
      } else {
        const code =
          res.status === 401 ? "unauthorized" : (body.error ?? "server");
        setError(
          errors.has(code) ? errors(code as "server") : errors("server"),
        );
      }
    } catch {
      setError(errors("server"));
    } finally {
      setBusy(false);
    }
  }

  if (verified) {
    return (
      <p className="rounded-lg border border-brand/40 p-3 text-sm tabular-nums">
        ✓{" "}
        {t("verified", {
          mrr: moneyFull(verified.mrr),
          revenue: moneyFull(verified.revenue),
        })}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("revenueIntro")}</p>
      <ol className="list-decimal space-y-1.5 rounded-lg border p-4 pl-9 text-sm">
        <li>{t("howTo1")}</li>
        <li>{t("howTo2")}</li>
        <li>{t("howTo3")}</li>
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" className="px-4">
          <a href={STRIPE_KEY_URL} target="_blank" rel="noopener noreferrer">
            {t("openStripe")}
            <ExternalLinkIcon />
          </a>
        </Button>
        <a
          href={STRIPE_TEST_KEY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("openStripeTest")}
        </a>
      </div>
      <form onSubmit={verify} className="space-y-3">
        <Field label={t("keyLabel")} htmlFor="key">
          <input
            id="key"
            type="password"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="rk_live_…"
            maxLength={300}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className={cn(inputClass, "font-mono")}
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !key.trim()} className="px-4">
          {busy ? t("verifying") : t("verify")}
        </Button>
      </form>
    </div>
  );
}
