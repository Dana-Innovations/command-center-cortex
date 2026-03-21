"use client";

import { SkeletonBox, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

export function CommunicationsViewSkeleton() {
  return (
    <div className="space-y-4">
      {/* Surface intro */}
      <SkeletonCard>
        <SkeletonBox className="h-3 w-24" rounded="rounded-full" />
        <SkeletonBox className="mt-3 h-7 w-2/3" />
        <SkeletonBox className="mt-2 h-4 w-4/5" />
      </SkeletonCard>

      {/* Filter bar */}
      <SkeletonBox className="h-10 w-full" rounded="rounded-2xl" />

      {/* Reply queue items */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i}>
            <div className="flex items-start gap-3">
              <SkeletonBox className="h-5 w-16" rounded="rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBox className="h-4 w-3/5" />
                <SkeletonBox className="h-3 w-1/3" />
                <SkeletonText lines={2} lastLineWidth="w-4/5" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
