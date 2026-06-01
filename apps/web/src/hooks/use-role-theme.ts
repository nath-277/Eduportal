'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { applyTheme, roleThemes, defaultTheme } from '@/lib/themes';
import type { UserRole } from '@eduportal/shared';

export function useRoleTheme(): void {
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    if (!role) {
      applyTheme(defaultTheme);
      return;
    }
    applyTheme(roleThemes[role as UserRole]);
  }, [role]);
}
