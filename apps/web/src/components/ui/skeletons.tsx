import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2 border-b pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 py-1.5">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-1 h-3 w-1/2" />
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3.5 w-3.5 rounded" />
      </div>
    </div>
  );
}

export function CourseCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ResourceCardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <Skeleton className="h-7 w-7 rounded-md" />
    </div>
  );
}

export function ResourceCardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <ResourceCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 160 }: { height?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-24" />
      <div className="flex items-end gap-1" style={{ height }}>
        {[40, 65, 30, 80, 55, 70, 45, 90, 60, 75].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
