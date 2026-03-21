"use client";

import {
  SkeletonBox,
  SkeletonCard,
  SkeletonCircle,
} from "@/components/ui/Skeleton";

export function PeopleViewSkeleton() {
  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} className="p-4">
            <SkeletonBox className="h-3 w-16" />
            <SkeletonBox className="mt-2 h-8 w-12" />
          </SkeletonCard>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonBox key={i} className="h-8 w-20" rounded="rounded-full" />
        ))}
        <SkeletonBox className="ml-auto h-8 w-48" rounded="rounded-xl" />
      </div>

      {/* Contact grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} className="p-4">
            <div className="flex items-center gap-3">
              <SkeletonCircle size="md" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBox className="h-4 w-1/3" />
                <SkeletonBox className="h-3 w-2/3" />
              </div>
            </div>
            <SkeletonBox className="mt-3 h-2 w-full" rounded="rounded-full" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
