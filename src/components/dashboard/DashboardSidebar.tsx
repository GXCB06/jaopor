"use client";

import {
  ArrowLeftIcon,
  LayoutGridIcon,
  LogOutIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  PlugIcon,
  RocketIcon,
  SlidersHorizontalIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, usePathname } from "@/i18n/navigation";
import { PersonPhoto } from "@/components/PersonPhoto";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  key: string;
  icon: LucideIcon;
  count?: number;
  badge?: number;
  soon?: boolean;
};

/**
 * Design.md §5 DashboardShell sidebar (docs/design/dashboard.png): main items, "คอมมูนิตี้"
 * (คนสร้าง / หา Co-founder, both "เร็ว ๆ นี้" until Phase 9c), and the user card with theme /
 * language / sign-out. Below `lg` the items become a horizontal scroll row above the content.
 */
export function DashboardSidebar({
  name,
  handle,
  avatar,
  startups,
  unread,
  messages,
}: {
  name: string;
  handle: string;
  avatar: string | null;
  startups: number;
  unread: number;
  /** Unread chat messages (Phase 11). */
  messages: number;
}) {
  const t = useTranslations("Me");
  const pathname = usePathname();
  const signOut = useRef<HTMLFormElement>(null);

  const main: Item[] = [
    { href: "/dashboard", key: "overview", icon: LayoutGridIcon },
    {
      href: "/dashboard/startups",
      key: "startups",
      icon: RocketIcon,
      count: startups,
    },
    { href: "/dashboard/profile", key: "profile", icon: UserIcon },
    {
      href: "/dashboard/requests",
      key: "requests",
      icon: MessageSquareIcon,
      badge: unread,
    },
    {
      href: "/dashboard/messages",
      key: "messages",
      icon: MessagesSquareIcon,
      badge: messages,
    },
    // "ที่บันทึกไว้" (saved) stays out of the menu until bookmarks exist (UX audit C-6); the page itself still answers.
    { href: "/dashboard/connections", key: "connections", icon: PlugIcon },
    {
      href: "/dashboard/settings",
      key: "settings",
      icon: SlidersHorizontalIcon,
    },
  ];
  const community: Item[] = [
    { href: "/builders", key: "builders", icon: UsersIcon },
    {
      href: "/builders?status=looking_cofounder",
      key: "cofounder",
      icon: UserPlusIcon,
    },
  ];

  const active = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const row = (i: Item) => {
    const Icon = i.icon;
    const content = (
      <>
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{t(`nav.${i.key}`)}</span>
        {i.count !== undefined && i.count > 0 && (
          <span className="ml-auto text-2xs text-faint tabular-nums">
            {i.count}
          </span>
        )}
        {!!i.badge && (
          <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-2xs font-bold text-white tabular-nums">
            {i.badge}
          </span>
        )}
        {i.soon && (
          <span className="ml-auto rounded-full border px-1.5 text-3xs text-faint">
            {t("soon")}
          </span>
        )}
      </>
    );
    const cls = cn(
      "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-caption whitespace-nowrap transition-colors",
      active(i.href)
        ? "bg-secondary font-semibold text-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
    );
    return i.soon ? (
      <span
        key={i.key}
        aria-disabled="true"
        className={cn(cls, "cursor-default opacity-60 hover:bg-transparent")}
      >
        {content}
      </span>
    ) : (
      <Link
        key={i.key}
        href={i.href}
        className={cls}
        aria-current={active(i.href) ? "page" : undefined}
      >
        {content}
      </Link>
    );
  };

  return (
    <>
      {/* Phones / tablets: one scrollable row. On a project's edit page, one way back instead: the
          editor has its own section chips, and two rows left half the screen for the form (S-17). */}
      {/^\/dashboard\/\d+\/edit/.test(pathname) ? (
        <nav
          aria-label={t("navLabel")}
          className="-mx-4 border-b px-4 pb-2 lg:hidden"
        >
          <Link
            href="/dashboard/startups"
            className="inline-flex items-center gap-1.5 rounded-lg px-1 py-2 text-caption text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            {t("nav.startups")}
          </Link>
        </nav>
      ) : (
        <nav
          aria-label={t("navLabel")}
          className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 pb-2 lg:hidden"
        >
          {main.map(row)}
        </nav>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-20 hidden h-[calc(100dvh-6rem)] w-60 shrink-0 flex-col lg:flex">
        <nav aria-label={t("navLabel")} className="space-y-0.5">
          {main.map(row)}
          <p className="px-3 pt-4 pb-1 text-3xs font-bold tracking-wider text-faint uppercase">
            {t("community")}
          </p>
          {community.map(row)}
        </nav>
        <div className="mt-auto rounded-xl border bg-card p-3">
          <Link
            href={`/u/${handle}`}
            className="flex items-center gap-2.5 hover:underline"
          >
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-xs font-bold uppercase">
              <PersonPhoto src={avatar} fallback={name.slice(0, 2)} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold">
                {name}
              </span>
              <span className="block truncate text-2xs text-faint">
                @{handle}
              </span>
            </span>
          </Link>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <span className="flex items-center justify-center rounded-md border">
              <ThemeToggle />
            </span>
            <span className="flex h-8 items-center justify-center rounded-md border">
              <LocaleSwitch />
            </span>
            <button
              type="button"
              onClick={() => signOut.current?.submit()}
              aria-label={t("signOut")}
              title={t("signOut")}
              className="flex h-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOutIcon className="size-4" aria-hidden="true" />
            </button>
          </div>
          <form ref={signOut} action="/api/auth/signout" method="post" hidden />
        </div>
      </aside>
    </>
  );
}
