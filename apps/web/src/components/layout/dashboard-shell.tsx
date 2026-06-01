'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut } from 'lucide-react';
import { DesktopSidebar, type SidebarItem } from './desktop-sidebar';
import { BottomNavDock, type NavItem } from './bottom-nav-dock';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth.store';
import { useRoleTheme } from '@/hooks/use-role-theme';
import type { User, UserRole } from '@eduportal/shared';

interface DashboardShellProps {
  children: ReactNode;
  sidebarItems: SidebarItem[];
  dockItems: NavItem[];
  expandedDockItems?: NavItem[];
  role: UserRole;
  user: User;
  notificationCount?: number;
}

function initials(fullname: string): string {
  return fullname
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function DashboardShell({
  children,
  sidebarItems,
  dockItems,
  expandedDockItems,
  role,
  user,
  notificationCount = 0,
}: DashboardShellProps) {
  useRoleTheme();
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const logoutItem: NavItem = {
    icon: LogOut,
    label: 'Log out',
    onClick: () => {
      clearAuth();
      router.push('/login');
    },
  };

  const expandedHasLogout = (expandedDockItems ?? []).some(
    (i) => i.label.toLowerCase().includes('logout') || i.label.toLowerCase().includes('log out'),
  );

  const finalExpanded: NavItem[] = [
    ...(expandedDockItems ?? []),
    ...(notificationCount > 0
      ? [
          {
            icon: Bell,
            label: 'Notifications',
            href: `/${role.toLowerCase()}/notifications`,
          } satisfies NavItem,
        ]
      : []),
    ...(expandedHasLogout ? [] : [logoutItem]),
  ];

  const finalDock: NavItem[] = dockItems.slice(0, 5).map((item) => {
    if (item.href && item.href.endsWith('/notifications') && notificationCount > 0) {
      return { ...item, badge: notificationCount };
    }
    return item;
  });

  function handleLogout(): void {
    clearAuth();
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar items={sidebarItems} role={role} user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </p>
            <p className="truncate text-sm font-semibold md:text-base">
              {role.charAt(0) + role.slice(1).toLowerCase()} Dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              onClick={() => router.push(`/${role.toLowerCase()}/notifications`)}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              ) : null}
            </Button>
            <Avatar className="h-9 w-9">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullname} /> : null}
              <AvatarFallback>{initials(user.fullname)}</AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Log out"
              onClick={handleLogout}
              className="hidden md:inline-flex"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-8">{children}</main>
      </div>

      <BottomNavDock primaryItems={finalDock} expandedItems={finalExpanded} />
    </div>
  );
}
