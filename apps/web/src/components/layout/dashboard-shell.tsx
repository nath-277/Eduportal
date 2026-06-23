'use client';

import { type ReactNode, useState } from 'react';
import { Bell, LogOut, BookOpen, HelpCircle } from 'lucide-react';
import { DesktopSidebar, type SidebarItem } from './desktop-sidebar';
import { UserGuideDrawer } from './user-guide-drawer';
import { BottomNavDock, type NavItem } from './bottom-nav-dock';
import { NotificationMenu } from './notification-menu';
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
  showDock?: boolean;
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
  showDock = true,
}: DashboardShellProps) {
  useRoleTheme();
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const logoutItem: NavItem = {
    icon: LogOut,
    label: 'Log out',
    onClick: () => {
      clearAuth();
      window.location.replace('/login');
    },
  };

  const expandedHasLogout = (expandedDockItems ?? []).some(
    (i) => i.label.toLowerCase().includes('logout') || i.label.toLowerCase().includes('log out'),
  );

  const finalExpanded: NavItem[] = [
    ...(expandedDockItems ?? []),
    {
      icon: BookOpen,
      label: 'User Guide',
      onClick: () => setIsUserGuideOpen(true),
    },
    {
      icon: HelpCircle,
      label: 'Support',
      href: '/support',
    },
    {
      icon: Bell,
      label: 'Notifications',
      badge: notificationCount,
      href: `/${role.toLowerCase()}/notifications`,
    },
    ...(expandedHasLogout ? [] : [logoutItem]),
  ];

  const finalDock: NavItem[] = dockItems.slice(0, 5).map((item) => {
    if (item.href && item.href.endsWith('/notifications')) {
      return {
        ...item,
        badge: notificationCount,
      };
    }
    return item;
  });

  function handleLogout(): void {
    clearAuth();
    window.location.replace('/login');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar
        items={sidebarItems}
        role={role}
        user={user}
        onOpenUserGuide={() => setIsUserGuideOpen(true)}
      />

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
            <NotificationMenu
              role={role}
              initialUnreadCount={notificationCount}
              open={isNotificationsOpen}
              onOpenChange={setIsNotificationsOpen}
            />
            <Avatar className="h-9 w-9">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullname} /> : null}
              <AvatarFallback>{initials(user.fullname)}</AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Log out"
              onClick={handleLogout}
              className="hidden md:inline-flex text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-8">{children}</main>
      </div>

      <BottomNavDock
        primaryItems={finalDock}
        expandedItems={finalExpanded}
        hiddenOnDesktop={!showDock}
      />

      <UserGuideDrawer open={isUserGuideOpen} onOpenChange={setIsUserGuideOpen} role={role} />
    </div>
  );
}
