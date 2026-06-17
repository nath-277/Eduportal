'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardShell } from './dashboard-shell';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useAuthStore } from '@/stores/auth.store';
import { FullPageSpinner } from '@/components/ui/loading-spinner';
import { ErrorBoundary } from '@/components/error-boundary';
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
  const { user, role, isAuthenticated, isLoading } = useAuthGuard();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'mine', 'student'],
    queryFn: async () => api.get<NotificationsResponse>('/notifications/mine'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (!isAuthenticated) return null;
  if (isLoading || !user || role !== 'STUDENT') {
    return <FullPageSpinner label="Loading your dashboard…" />;
  }

  const handleLogout = () => {
    clearAuth();
    window.location.replace('/login');
  };

  return (
    <ErrorBoundary label="student dashboard">
      <DashboardShell
        role="STUDENT"
        user={user}
        sidebarItems={toSidebarItems(studentSidebarItems)}
        dockItems={toDockItems(studentDockPrimary, { onLogout: handleLogout })}
        expandedDockItems={toDockItems(studentDockExpanded, { onLogout: handleLogout })}
        notificationCount={notificationsQuery.data?.unreadCount ?? 0}
        showDock={false}
      >
        {children}
      </DashboardShell>
    </ErrorBoundary>
  );
}
