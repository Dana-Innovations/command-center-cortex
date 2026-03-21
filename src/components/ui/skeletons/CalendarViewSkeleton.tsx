"use client";

import { SkeletonBox, SkeletonCard } from "@/components/ui/Skeleton";

export function CalendarViewSkeleton() {
  return (
    <div className="space-y-4">
      {/* Surface intro */}
      <SkeletonCard>
        <SkeletonBox className="h-3 w-24" rounded="rounded-full" />
        <SkeletonBox className="mt-3 h-7 w-1/2" />
        <SkeletonBox className="mt-2 h-4 w-3/4" />
      </SkeletonCard>

      {/* Sub-nav pills */}
      <div className="flex gap-2">
        <SkeletonBox className="h-9 w-24" rounded="rounded-xl" />
        <SkeletonBox className="h-9 w-24" rounded="rounded-xl" />
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <SkeletonBox className="h-4 w-14 shrink-0" />
            <SkeletonBox className="h-16 w-full" rounded="rounded-[20px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
