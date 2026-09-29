"use client";

import type { User } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

/** Client-side auth widget → the header needs no cookies, so public pages stay static. */
export function HeaderAuth() {
  const t = useTranslations("Nav");
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (user === undefined)
    return <span className="h-4 w-16 animate-pulse rounded bg-muted" />;

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {t("signIn")}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard"
        className="text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {t("dashboard")}
      </Link>
      <form action="/api/auth/signout" method="post">
        <button
          type="submit"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
