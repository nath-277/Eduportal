'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardShell } from './dashboard-shell';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useAuthStore } from '@/stores/auth.store';
import { FullPageSpinner } from '@/components/ui/loading-spinner';
import { ErrorBoundary } from '@/components/error-boundary';
import { api } from '@/lib/api';
import {
  lecturerSidebarItems,
  lecturerDockPrimary,
  lecturerDockExpanded,
  toSidebarItems,
  toDockItems,
} from '@/config/lecturer-nav';

interface NotificationsResponse {
  unreadCount: number;
  notifications: Array<{ id: string; isRead: boolean }>;
}

export function LecturerShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading } = useAuthGuard();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'badge', 'lecturer'],
    queryFn: async () => api.get<NotificationsResponse>('/notifications/mine'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (isLoading || !user || role !== 'LECTURER') {
    return <FullPageSpinner label="Loading your dashboard…" />;
  }
  if (!isAuthenticated) return null;

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <ErrorBoundary label="lecturer dashboard">
      <DashboardShell
        role="LECTURER"
        user={user}
        sidebarItems={toSidebarItems(lecturerSidebarItems)}
        dockItems={toDockItems(lecturerDockPrimary, { onLogout: handleLogout })}
        expandedDockItems={toDockItems(lecturerDockExpanded, { onLogout: handleLogout })}
        notificationCount={notificationsQuery.data?.unreadCount ?? 0}
      >
        {children}
      </DashboardShell>
    </ErrorBoundary>
  );
}
