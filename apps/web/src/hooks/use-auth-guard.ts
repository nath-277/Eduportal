'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@eduportal/shared';

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password']);

export function roleHome(role: UserRole): string {
  switch (role) {
    case 'STUDENT':
      return '/student/dashboard';
    case 'LECTURER':
      return '/lecturer/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    default:
      return '/login';
  }
}

export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, isAuthenticated } = useAuthStore();
  const [hasHydrated, setHasHydrated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return useAuthStore.persist.hasHydrated();
  });
  const [mounted, setMounted] = useState(false);
  const [minLoadingDone, setMinLoadingDone] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
    }, 0);
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });

    const timer = setTimeout(() => {
      setMinLoadingDone(true);
    }, 3000); // 3 seconds minimum display duration

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);

  const isPublic = pathname === null ? false : PUBLIC_PATHS.has(pathname) || pathname.startsWith('/reset-password');

  useEffect(() => {
    if (!mounted || !hasHydrated) return;

    if (!isAuthenticated || !user) {
      if (!isPublic) {
        router.replace('/login');
      }
      return;
    }

    if (isPublic) {
      router.replace(roleHome(user.role));
    }
  }, [mounted, hasHydrated, isAuthenticated, user, isPublic, router]);

  return {
    user,
    role: user?.role ?? null,
    token,
    isAuthenticated,
    isLoading: !mounted || !hasHydrated || (!isPublic && !minLoadingDone),
  };
}
