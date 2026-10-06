import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { redirect } from "@/i18n/navigation";
import { getUserId } from "@/lib/auth";
import { myUnreadMessages } from "@/lib/data/chat";
import { getMyProfile, pendingRequests } from "@/lib/data/me";
import { createClient } from "@/lib/supabase/server";

// Design.md §5 DashboardShell (Phase 9d): sidebar + content. A signed-in user without a username
// goes through onboarding first (spec 9e). Signed out: only the page renders, and every dashboard
// page gates itself with its own path (requireUserId), so sign-in returns to that exact page
// (a gate here only knows "/dashboard").
export default async function DashboardLayout({
  children,
  params,
}: LayoutProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  const userId = await getUserId();
  if (!userId) return <>{children}</>;
  const profile = await getMyProfile(userId);
  if (!profile?.handle) redirect({ href: "/onboarding", locale });

  const supabase = await createClient();
  const [{ count: startups }, unread, messages] = await Promise.all([
    supabase
      .from("startup_members")
      .select("startup_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "confirmed"),
    pendingRequests(userId),
    myUnreadMessages(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 pt-6 pb-12 max-lg:flex-col max-lg:gap-4">
      <DashboardSidebar
        name={profile!.display_name ?? profile!.handle!}
        handle={profile!.handle!}
        avatar={
          profile!.avatar_url?.startsWith("https://")
            ? profile!.avatar_url
            : null
        }
        startups={startups ?? 0}
        unread={unread}
        messages={messages}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
