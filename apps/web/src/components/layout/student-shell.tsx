'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardShell } from './dashboard-shell';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useAuthStore } from '@/stores/auth.store';
import { FullPageSpinner } from '@/components/ui/loading-spinner';
import { api } from '@/lib/api';
import {
  studentSidebarItems,
  studentDockPrimary,
  studentDockExpanded,
  toSidebarItems,
  toDockItems,
} from '@/config/student-nav';

interface NotificationsResponse {
  unreadCount: number;
  notifications: Array<{ id: string; isRead: boolean }>;
}

export function StudentShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading } = useAuthGuard();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'badge'],
    queryFn: async () => api.get<NotificationsResponse>('/notifications/mine'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (isLoading || !user || role !== 'STUDENT') {
    return <FullPageSpinner label="Loading your dashboard…" />;
  }
  if (!isAuthenticated) return null;

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <DashboardShell
      role="STUDENT"
      user={user}
      sidebarItems={toSidebarItems(studentSidebarItems)}
      dockItems={toDockItems(studentDockPrimary, { onLogout: handleLogout })}
      expandedDockItems={toDockItems(studentDockExpanded, { onLogout: handleLogout })}
      notificationCount={notificationsQuery.data?.unreadCount ?? 0}
    >
      {children}
    </DashboardShell>
  );
}
