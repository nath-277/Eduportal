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
  adminSidebarItems,
  adminDockPrimary,
  adminDockExpanded,
  toSidebarItems,
  toDockItems,
} from '@/config/admin-nav';

interface NotificationsResponse {
  unreadCount: number;
  notifications: Array<{ id: string; isRead: boolean }>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, role, isAuthenticated, isLoading } = useAuthGuard();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'mine', 'admin'],
    queryFn: async () => api.get<NotificationsResponse>('/notifications/mine'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (!isAuthenticated) return null;
  if (isLoading || !user || role !== 'ADMIN') {
    return <FullPageSpinner label="Loading your dashboard…" />;
  }

  const handleLogout = () => {
    clearAuth();
    window.location.replace('/login');
  };

  return (
    <ErrorBoundary label="admin dashboard">
      <DashboardShell
        role="ADMIN"
        user={user}
        sidebarItems={toSidebarItems(adminSidebarItems)}
        dockItems={toDockItems(adminDockPrimary, { onLogout: handleLogout })}
        expandedDockItems={toDockItems(adminDockExpanded, { onLogout: handleLogout })}
        notificationCount={notificationsQuery.data?.unreadCount ?? 0}
        showDock={false}
      >
        {children}
      </DashboardShell>
    </ErrorBoundary>
  );
}
