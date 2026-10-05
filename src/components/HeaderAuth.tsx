"use client";

import type { User } from "@supabase/supabase-js";
import {
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  MessageCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { PersonPhoto } from "@/components/PersonPhoto";
import { onAvatarChange } from "@/lib/avatar-events";
import { safeNextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/client";
import { MessagesLink } from "./chat/MessagesLink";
import { NotificationBell } from "./NotificationBell";

/**
 * Client-side auth widget → the header needs no cookies, so public pages stay static.
 * Design.md §5 SiteHeader: signed in = one avatar button with a menu (fits 360px).
 */
export function HeaderAuth() {
  const t = useTranslations("Nav");
  // Sign-in returns here (Design.md §6 Sign-in routing); the full path includes the locale.
  const here = safeNextPath(usePathname());
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const signOutForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // The profile photo (uploaded or the sign-in one) wins over the provider's current photo.
  const userId = user?.id;
  const [photo, setPhoto] = useState<{ id: string; url: string | null }>();
  useEffect(() => {
    if (!userId) return;
    void createClient()
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) =>
        setPhoto({ id: userId, url: data?.avatar_url ?? null }),
      );
    // The profile editor announces a confirmed change, so the header follows without a reload.
    return onAvatarChange((url) => setPhoto({ id: userId, url }));
  }, [userId]);

  if (user === undefined)
    return <span className="size-8 animate-pulse rounded-full bg-muted" />;

  if (!user) {
    return (
      <Link
        href={{ pathname: "/login", query: here ? { next: here } : {} }}
        aria-label={t("signIn")}
        className="inline-flex h-8 items-center text-xs font-medium whitespace-nowrap text-muted-foreground hover:text-foreground max-sm:size-8 max-sm:justify-center max-sm:rounded-md max-sm:hover:bg-accent"
      >
        <LogInIcon className="size-4 sm:hidden" aria-hidden="true" />
        <span className="hidden sm:inline">{t("signIn")}</span>
      </Link>
    );
  }

  const meta = user.user_metadata as {
    avatar_url?: string;
    full_name?: string;
    name?: string;
  };
  const name = meta.full_name ?? meta.name ?? user.email ?? "";
  const avatar =
    photo?.id === user.id
      ? photo.url?.startsWith("https://")
        ? photo.url
        : null
      : typeof meta.avatar_url === "string" &&
          meta.avatar_url.startsWith("https://")
        ? meta.avatar_url
        : null;

  return (
    <>
      {/* Phones: the chat icon is in the dashboard; the header keeps the bell only. */}
      <span className="hidden sm:contents">
        <MessagesLink userId={user.id} />
      </span>
      <NotificationBell />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("account")}
          className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-xs font-bold text-muted-foreground uppercase hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <PersonPhoto src={avatar} fallback={name.slice(0, 1)} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel className="truncate text-caption font-normal text-muted-foreground">
            {user.email ?? name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboardIcon aria-hidden="true" />
              {t("dashboard")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/messages">
              <MessageCircleIcon aria-hidden="true" />
              {t("messages")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => signOutForm.current?.submit()}>
            <LogOutIcon aria-hidden="true" />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form ref={signOutForm} action="/api/auth/signout" method="post" hidden />
    </>
  );
}
