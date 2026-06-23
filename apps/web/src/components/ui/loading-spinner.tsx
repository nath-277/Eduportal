'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { SplashScreen } from './splash-screen';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = 24, className, label }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2
        className="animate-spin text-primary"
        style={{ width: size, height: size }}
        aria-label={label ?? 'Loading'}
      />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return <SplashScreen label={label} />;
}
