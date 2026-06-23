'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { SplashScreen } from './splash-screen';
import { Logo } from './logo';

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

export function SimplePageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center select-none">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <Logo className="h-7 w-7 text-primary shrink-0" iconClassName="h-7 w-7 text-primary shrink-0" />
        {/* Premium spinning border */}
        <span className="absolute -inset-[2px] rounded-2xl border-[2px] border-primary/20 border-t-primary animate-spin pointer-events-none" />
      </div>
      {label && <p className="text-xs font-semibold tracking-wider text-muted-foreground animate-pulse">{label}</p>}
    </div>
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  const [isFirstStart, setIsFirstStart] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      const hasStarted = sessionStorage.getItem('has_started_app');
      if (!hasStarted) {
        setIsFirstStart(true);
        sessionStorage.setItem('has_started_app', 'true');
      }
      setChecked(true);
    }, 0);
  }, []);

  if (!checked) {
    return null;
  }

  if (isFirstStart) {
    return <SplashScreen label={label} />;
  }

  return <SimplePageLoader label={label} />;
}
