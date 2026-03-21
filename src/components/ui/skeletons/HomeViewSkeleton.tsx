"use client";

import { SkeletonBox, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

export function HomeViewSkeleton() {
  return (
    <div className="space-y-4">
      {/* Hero card */}
      <SkeletonCard className="overflow-hidden">
        <div className="space-y-4">
          <SkeletonBox className="h-4 w-36" rounded="rounded-full" />
          <SkeletonBox className="h-8 w-3/4" />
          <SkeletonText lines={2} lastLineWidth="w-2/3" />
          <div className="flex gap-2 pt-2">
            <SkeletonBox className="h-9 w-28" rounded="rounded-xl" />
            <SkeletonBox className="h-9 w-24" rounded="rounded-xl" />
          </div>
        </div>
      </SkeletonCard>

      {/* Quick actions row */}
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <SkeletonBox key={i} className="h-9 w-32" rounded="rounded-full" />
        ))}
      </div>

      {/* Collapsible section headers */}
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i}>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonBox className="h-5 w-40" />
              <SkeletonBox className="h-3 w-64" />
            </div>
            <SkeletonBox className="h-5 w-5" rounded="rounded" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}
