'use client';

import { GraduationCap } from 'lucide-react';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/ui/loading-spinner';
import type { SidebarItem } from '@/components/layout/desktop-sidebar';
import type { NavItem } from '@/components/layout/bottom-nav-dock';
import { BookOpen, LayoutDashboard, MessageSquare, FileText, Trophy, Bell } from 'lucide-react';

const sidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Overview', href: '/student/dashboard' },
  { icon: BookOpen, label: 'Courses', href: '/student/courses' },
  { icon: Trophy, label: 'Results', href: '/student/results' },
  { icon: FileText, label: 'Resources', href: '/student/resources' },
  { icon: MessageSquare, label: 'Forum', href: '/student/forum' },
  { icon: Bell, label: 'Announcements', href: '/student/announcements' },
];

const dockItems: NavItem[] = [
  { icon: BookOpen, label: 'Courses', href: '/student/courses' },
  { icon: Trophy, label: 'Results', href: '/student/results' },
  { icon: FileText, label: 'Resources', href: '/student/resources' },
];

const expandedItems: NavItem[] = [
  { icon: MessageSquare, label: 'Forum', href: '/student/forum' },
  { icon: Bell, label: 'Announcements', href: '/student/announcements' },
];

export default function StudentDashboardPage() {
  const { user, role, isAuthenticated, isLoading } = useAuthGuard();

  if (isLoading || !user || role !== 'STUDENT') {
    return <FullPageSpinner label="Loading your dashboard…" />;
  }
  if (!isAuthenticated) return null;

  return (
    <DashboardShell
      role="STUDENT"
      user={user}
      sidebarItems={sidebarItems}
      dockItems={dockItems}
      expandedDockItems={expandedItems}
    >
      <PageHeader
        title={`Welcome back, ${user.fullname.split(' ')[0]}`}
        subtitle="Here's what's happening in your department today."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Enrolled courses</p>
            <p className="mt-2 text-3xl font-semibold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Current GPA</p>
            <p className="mt-2 text-3xl font-semibold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">New announcements</p>
            <p className="mt-2 text-3xl font-semibold">—</p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
          <GraduationCap className="h-6 w-6 text-primary" />
          <p>
            This is a placeholder dashboard. Course, results, and announcement
            views land in the next milestone.
          </p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
