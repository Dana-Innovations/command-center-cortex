"use client";

import { SkeletonBox, SkeletonCard } from "@/components/ui/Skeleton";

export function PerformanceViewSkeleton() {
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
        <SkeletonBox className="h-9 w-20" rounded="rounded-xl" />
        <SkeletonBox className="h-9 w-20" rounded="rounded-xl" />
      </div>

      {/* Pipeline stages */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((stage) => (
          <div key={stage} className="space-y-3">
            <SkeletonBox className="h-5 w-24" />
            {[1, 2].map((deal) => (
              <SkeletonCard key={deal} className="p-4">
                <SkeletonBox className="h-4 w-3/4" />
                <SkeletonBox className="mt-2 h-3 w-1/2" />
                <SkeletonBox className="mt-2 h-3 w-1/3" />
              </SkeletonCard>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
