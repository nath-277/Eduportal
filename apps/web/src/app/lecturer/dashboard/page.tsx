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
  BookOpen,
  Trophy,
  Upload,
  MessageSquare,
  Bell,
  Users,
} from 'lucide-react';

const sidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Overview', href: '/lecturer/dashboard' },
  { icon: BookOpen, label: 'My courses', href: '/lecturer/courses' },
  { icon: Upload, label: 'Upload results', href: '/lecturer/results' },
  { icon: Users, label: 'Roster', href: '/lecturer/roster' },
  { icon: MessageSquare, label: 'Forum', href: '/lecturer/forum' },
  { icon: Bell, label: 'Announcements', href: '/lecturer/announcements' },
];

const dockItems: NavItem[] = [
  { icon: BookOpen, label: 'Courses', href: '/lecturer/courses' },
  { icon: Upload, label: 'Results', href: '/lecturer/results' },
  { icon: Users, label: 'Roster', href: '/lecturer/roster' },
];

const expandedItems: NavItem[] = [
  { icon: MessageSquare, label: 'Forum', href: '/lecturer/forum' },
  { icon: Bell, label: 'Announcements', href: '/lecturer/announcements' },
];

export default function LecturerDashboardPage() {
  const { user, role, isAuthenticated, isLoading } = useAuthGuard();

  if (isLoading || !user || role !== 'LECTURER') {
    return <FullPageSpinner label="Loading your dashboard…" />;
  }
  if (!isAuthenticated) return null;

  return (
    <DashboardShell
      role="LECTURER"
      user={user}
      sidebarItems={sidebarItems}
      dockItems={dockItems}
      expandedDockItems={expandedItems}
    >
      <PageHeader
        title={`Welcome, ${user.fullname.split(' ')[0]}`}
        subtitle="Manage your courses, results, and announcements in one place."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Assigned courses</p>
            <p className="mt-2 text-3xl font-semibold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Students in roster</p>
            <p className="mt-2 text-3xl font-semibold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Pending results</p>
            <p className="mt-2 text-3xl font-semibold">—</p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
          <Trophy className="h-6 w-6 text-primary" />
          <p>
            Placeholder dashboard. Course assignments, result uploads, and
            roster views land in the next milestone.
          </p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
