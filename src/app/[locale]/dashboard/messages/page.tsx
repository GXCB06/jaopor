import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChatShell } from "@/components/chat/ChatShell";
import { redirect } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth";
import { conversationWith, listConversations } from "@/lib/data/chat";
import { renderNow } from "@/lib/posts";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard/messages">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Chat" });
  return { title: t("title"), robots: { index: false } };
}

// Design.md §5 Chat: the list; `?with=<user id>` opens my conversation with that person
// ("ส่งข้อความ" on a profile or an accepted request).
export default async function MessagesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/dashboard/messages">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUserId(locale, "/dashboard/messages");
  const sp = await searchParams;
  const withId = typeof sp.with === "string" ? sp.with : null;
  if (withId && /^[0-9a-f-]{36}$/.test(withId)) {
    const id = await conversationWith(withId);
    if (id) redirect({ href: `/dashboard/messages/${id}`, locale });
  }
  const [t, conversations] = await Promise.all([
    getTranslations("Chat"),
    listConversations(),
  ]);
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <ChatShell
        conversations={conversations}
        activeId={null}
        now={renderNow()}
      >
        <div className="flex h-full items-center justify-center p-6 text-center text-caption text-faint">
          {conversations.length ? t("pick") : t("emptyHint")}
        </div>
      </ChatShell>
    </main>
  );
}
