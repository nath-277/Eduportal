'use client';

import { useSettings } from '@/hooks/use-settings';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

import Image from 'next/image';

interface LogoProps {
  className?: string;
  iconClassName?: string;
}

export function Logo({ className = 'h-5 w-5', iconClassName }: LogoProps) {
  const { data } = useSettings();

  if (data?.portalLogoUrl) {
    return (
      <div className={cn('relative shrink-0', className)}>
        <Image
          src={data.portalLogoUrl}
          alt={data.portalName || 'Logo'}
          fill
          sizes="(max-width: 768px) 40px, 40px"
          priority
          className="object-contain"
        />
      </div>
    );
  }

  return <GraduationCap className={cn(iconClassName || className)} />;
}
