"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "github";

export function LoginButtons({
  next,
  locale,
}: {
  /** Already validated (safeNextPath); null = let the callback decide. */
  next: string | null;
  locale: string;
}) {
  const t = useTranslations("Login");
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState(false);

  async function signIn(provider: Provider) {
    setPending(provider);
    setError(false);
    const params = new URLSearchParams({ locale });
    if (next) params.set("next", next);
    const redirectTo = `${window.location.origin}/api/auth/callback?${params}`;
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setError(true);
      setPending(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        size="lg"
        onClick={() => signIn("google")}
        disabled={pending !== null}
      >
        {t("google")}
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() => signIn("github")}
        disabled={pending !== null}
      >
        {t("github")}
      </Button>
      {error && <p className="text-sm text-destructive">{t("error")}</p>}
    </div>
  );
}
