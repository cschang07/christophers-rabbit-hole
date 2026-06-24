export function ArticleCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-stone-200 bg-white p-5">
      <div className="h-5 w-3/4 rounded bg-stone-200" />
      <div className="mt-3 h-3 w-full rounded bg-stone-100" />
      <div className="mt-2 h-3 w-5/6 rounded bg-stone-100" />
      <div className="mt-4 h-3 w-24 rounded bg-stone-100" />
    </div>
  );
}

export function ArticleListSkeleton() {
  return (
    <div className="space-y-4">
      <ArticleCardSkeleton />
      <ArticleCardSkeleton />
    </div>
  );
}

export function OutlookSkeleton() {
  return (
    <div className="mb-8 space-y-6">
      <div className="h-20 animate-pulse rounded-2xl border border-stone-200 bg-white" />
      <div className="h-16 animate-pulse rounded-2xl border border-stone-200 bg-white" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-52 animate-pulse rounded-2xl border border-stone-200 bg-white" />
        <div className="h-52 animate-pulse rounded-2xl border border-stone-200 bg-white" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-stone-200 bg-white" />
    </div>
  );
}
