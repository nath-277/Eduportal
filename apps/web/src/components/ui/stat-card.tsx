'use client';

import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  trendValue?: string;
  description?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  description,
  className,
}: StatCardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trend === 'down'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-muted-foreground';

  const TrendIcon = trend === 'down' ? TrendingDown : TrendingUp;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
            {(trend || description) && (
              <div className="flex items-center gap-1.5 pt-1 text-xs">
                {trend && trendValue ? (
                  <span className={cn('flex items-center gap-0.5 font-medium', trendColor)}>
                    <TrendIcon className="h-3.5 w-3.5" />
                    {trendValue}
                  </span>
                ) : null}
                {description ? (
                  <span className="text-muted-foreground">{description}</span>
                ) : null}
              </div>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
