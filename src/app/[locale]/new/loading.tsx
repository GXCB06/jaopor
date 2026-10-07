import { Skeleton } from "@/components/ui/skeleton";

// Design.md §7 Loading: a skeleton shaped like wizard step 1, shown the moment "เพิ่ม Startup" is
// clicked (the page itself waits for the sign-in check). Also lets Next prefetch this shell.
export default function NewStartupLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8"
    >
      <Skeleton className="h-8 w-64 md:h-9" />
      <div className="flex gap-2">
        <Skeleton className="h-1 flex-1" />
        <Skeleton className="h-1 flex-1" />
      </div>
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <div className="space-y-2 sm:col-span-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Skeleton className="size-12 rounded-xl" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <Skeleton className="h-9 w-36" />
    </main>
  );
}
