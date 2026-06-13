'use client';

import { useSettings } from '@/hooks/use-settings';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconClassName?: string;
}

export function Logo({ className = 'h-5 w-5', iconClassName }: LogoProps) {
  const { data } = useSettings();

  if (data?.portalLogoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={data.portalLogoUrl}
        alt={data.portalName || 'Logo'}
        className={cn('object-contain', className)}
      />
    );
  }

  return <GraduationCap className={cn(iconClassName || className)} />;
}
