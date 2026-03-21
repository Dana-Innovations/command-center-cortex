"use client";

import { SkeletonBox, SkeletonCard } from "@/components/ui/Skeleton";

export function OperationsViewSkeleton() {
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

      {/* Task rows */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} className="p-4">
            <div className="flex items-center gap-4">
              <SkeletonBox className="h-4 w-1/4" />
              <SkeletonBox className="h-3 w-1/2" />
              <SkeletonBox className="ml-auto h-3 w-20" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
