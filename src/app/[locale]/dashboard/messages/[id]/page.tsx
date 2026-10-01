import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChatShell } from "@/components/chat/ChatShell";
import { ChatThread } from "@/components/chat/ChatThread";
import { requireUserId } from "@/lib/auth";
import { getConversation, listConversations } from "@/lib/data/chat";
import { renderNow } from "@/lib/posts";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard/messages/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Chat" });
  return { title: t("title"), robots: { index: false } };
}

// Design.md §5 Chat: one conversation (only for its two people; anything else is a 404).
export default async function ConversationPage({
  params,
}: PageProps<"/[locale]/dashboard/messages/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireUserId(locale, `/dashboard/messages/${id}`);
  const conversationId = /^[0-9]{1,18}$/.test(id) ? Number(id) : 0;
  const [t, convo, conversations] = await Promise.all([
    getTranslations("Chat"),
    getConversation(conversationId),
    listConversations(),
  ]);
  if (!convo) notFound();
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight max-lg:sr-only">
        {t("title")}
      </h1>
      <ChatShell
        conversations={conversations}
        activeId={convo.id}
        now={renderNow()}
      >
        <ChatThread
          key={convo.id}
          conversationId={convo.id}
          viewer={convo.viewer}
          other={convo.other}
          blocked={convo.blocked}
          initial={convo.messages}
        />
      </ChatShell>
    </main>
  );
}
