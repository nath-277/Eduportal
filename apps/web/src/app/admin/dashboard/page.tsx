'use client';

import { useAuthGuard } from '@/hooks/use-auth-guard';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/ui/loading-spinner';
import type { SidebarItem } from '@/components/layout/desktop-sidebar';
import type { NavItem } from '@/components/layout/bottom-nav-dock';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  MessageSquare,
  Bell,
  Shield,
  Megaphone,
} from 'lucide-react';

const sidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Overview', href: '/admin/dashboard' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: BookOpen, label: 'Courses', href: '/admin/courses' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Megaphone, label: 'Announcements', href: '/admin/announcements' },
  { icon: MessageSquare, label: 'Forum', href: '/admin/forum' },
  { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
  { icon: Shield, label: 'Audit log', href: '/admin/audit' },
];

const dockItems: NavItem[] = [
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: BookOpen, label: 'Courses', href: '/admin/courses' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
];

const expandedItems: NavItem[] = [
  { icon: Megaphone, label: 'Announcements', href: '/admin/announcements' },
  { icon: MessageSquare, label: 'Forum', href: '/admin/forum' },
  { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
  { icon: Shield, label: 'Audit log', href: '/admin/audit' },
];

export default function AdminDashboardPage() {
  const { user, role, isAuthenticated, isLoading } = useAuthGuard();

  if (isLoading || !user || role !== 'ADMIN') {
    return <FullPageSpinner label="Loading your dashboard…" />;
  }
  if (!isAuthenticated) return null;

  return (
    <DashboardShell
      role="ADMIN"
      user={user}
      sidebarItems={sidebarItems}
      dockItems={dockItems}
      expandedDockItems={expandedItems}
    >
      <PageHeader
        title="Admin overview"
        subtitle="Health, governance, and department-wide activity."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Active users</p>
            <p className="mt-2 text-3xl font-semibold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Active courses</p>
            <p className="mt-2 text-3xl font-semibold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Enrollments</p>
            <p className="mt-2 text-3xl font-semibold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Open announcements</p>
            <p className="mt-2 text-3xl font-semibold">—</p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
          <Shield className="h-6 w-6 text-primary" />
          <p>
            Placeholder dashboard. User management, course assignments, and
            analytics land in the next milestone.
          </p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
