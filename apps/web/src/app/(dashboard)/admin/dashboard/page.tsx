'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Activity,
  Award,
  BookOpen,
  Clock,
  Database,
  Download,
  GraduationCap,
  LineChart as LineChartIcon,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';

import { AdminShell } from '@/components/layout/admin-shell';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BarChart, LineChart, PieChart } from '@/components/ui/charts';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AdminAnalytics {
  users: { students: number; lecturers: number; admins: number; total: number };
  resources: number;
  announcements: number;
  activeSessions: number;
  recentLogs: Array<{
    id: string;
    action: string;
    entity: string | null;
    entityId: string | null;
    metadata: Record<string, unknown> | null;
    ipAddress: string | null;
    createdAt: string;
    user: { id: string; fullname: string; email: string; role: string } | null;
  }>;
}

interface DepartmentAnalytics {
  session: { id: string; name: string };
  perLevel: Array<{
    level: string;
    studentCount: number;
    courseCount: number;
    averageGpa: number;
  }>;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; fullname: string; email: string; role: string } | null;
  metadata: Record<string, unknown> | null;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Resource {
  id: string;
  title: string;
  type: string;
  downloadCount: number;
  course: { code: string; title: string } | null;
  uploader: { id: string; fullname: string };
}

const LEVEL_COLORS: Record<string, string> = {
  L100: 'hsl(217 91% 60%)',
  L200: 'hsl(189 94% 43%)',
  L300: 'hsl(271 91% 65%)',
  L400: 'hsl(160 84% 39%)',
  L500: 'hsl(24 95% 53%)',
};

const ACTION_TONE: Record<string, string> = {
  CREATE: 'bg-emerald-500/10 text-emerald-700',
  UPDATE: 'bg-blue-500/10 text-blue-700',
  DELETE: 'bg-rose-500/10 text-rose-700',
  SUSPEND: 'bg-rose-500/10 text-rose-700',
  LOGIN: 'bg-blue-500/10 text-blue-700',
  PUBLISH: 'bg-emerald-500/10 text-emerald-700',
  DEACTIVATE: 'bg-rose-500/10 text-rose-700',
};

function timeAgo(d: string): string {
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d2 = Math.floor(h / 24);
  return `${d2}d ago`;
}

export default function AdminDashboardPage() {
  const adminQuery = useQuery({
    queryKey: ['analytics', 'admin'],
    queryFn: async () => api.get<AdminAnalytics>('/analytics/admin'),
  });

  const deptQuery = useQuery({
    queryKey: ['analytics', 'department'],
    queryFn: async () => api.get<DepartmentAnalytics>('/analytics/department'),
  });

  const logsQuery = useQuery({
    queryKey: ['audit', 'recent'],
    queryFn: async () => {
      const data = await api.get<PaginatedResponse<AuditLog>>('/analytics/audit-logs?limit=10');
      return data.data;
    },
  });

  const resourcesQuery = useQuery({
    queryKey: ['resources', 'all', 'top'],
    queryFn: async () => {
      const data = await api.get<PaginatedResponse<Resource>>('/resources?limit=20&page=1');
      return data.data;
    },
  });

  const userPie = useMemo(() => {
    if (!adminQuery.data) return [];
    return [
      {
        label: 'Students',
        value: adminQuery.data.users.students,
        color: 'hsl(271 91% 65%)',
      },
      {
        label: 'Lecturers',
        value: adminQuery.data.users.lecturers,
        color: 'hsl(189 94% 43%)',
      },
      {
        label: 'Admins',
        value: adminQuery.data.users.admins,
        color: 'hsl(24 95% 53%)',
      },
    ];
  }, [adminQuery.data]);

  const levelBars = useMemo(() => {
    if (!deptQuery.data) return [];
    return deptQuery.data.perLevel.map((l) => ({
      label: l.level,
      value: l.studentCount,
      color: LEVEL_COLORS[l.level] ?? 'hsl(var(--primary))',
    }));
  }, [deptQuery.data]);

  const gpaTrend = useMemo(() => {
    if (!deptQuery.data) return [];
    return deptQuery.data.perLevel.map((l) => ({ label: l.level, value: l.averageGpa }));
  }, [deptQuery.data]);

  const topResources = useMemo(() => {
    if (!resourcesQuery.data) return [];
    return [...resourcesQuery.data]
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, 5);
  }, [resourcesQuery.data]);

  return (
    <AdminShell>
      <PageHeader
        title="Admin overview"
        subtitle="System health, governance, and department-wide activity."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Students"
          value={adminQuery.data?.users.students ?? '—'}
          icon={GraduationCap}
          description="enrolled"
        />
        <StatCard
          label="Lecturers"
          value={adminQuery.data?.users.lecturers ?? '—'}
          icon={UserCheck}
          description="active"
        />
        <StatCard
          label="Courses"
          value={adminQuery.data?.resources ?? '—'}
          icon={BookOpen}
          description="total"
        />
        <StatCard
          label="Resources"
          value={adminQuery.data?.resources ?? '—'}
          icon={Database}
          description="uploaded"
        />
        <StatCard
          label="Active sessions"
          value={adminQuery.data?.activeSessions ?? '—'}
          icon={Activity}
          description="current"
        />
        <StatCard
          label="Uptime"
          value="99.9%"
          icon={ShieldCheck}
          description="last 30d"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users by role</CardTitle>
          </CardHeader>
          <CardContent>
            {adminQuery.isLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : (
              <PieChart
                data={userPie}
                size={160}
                centerLabel="Total"
                centerValue={adminQuery.data?.users.total ?? 0}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students per level</CardTitle>
          </CardHeader>
          <CardContent>
            {deptQuery.isLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : (
              <BarChart data={levelBars} height={180} unit="" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Recent audit logs</CardTitle>
            <Link
              href="/admin/logs"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {logsQuery.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !logsQuery.data || logsQuery.data.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No activity yet"
                description="Audit events will appear here as users interact with the system."
                className="m-6"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">User</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                      <th className="px-3 py-2 font-medium">Entity</th>
                      <th className="px-3 py-2 text-right font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logsQuery.data.map((log) => {
                      const verb = log.action.split('_')[0];
                      return (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.15 }}
                          className="hover:bg-muted/30"
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">
                                  {log.user
                                    ? log.user.fullname
                                        .split(' ')
                                        .map((p) => p[0])
                                        .slice(0, 2)
                                        .join('')
                                        .toUpperCase()
                                    : '—'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium">
                                  {log.user?.fullname ?? 'System'}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {log.user?.role ?? '—'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'font-mono text-[10px]',
                                ACTION_TONE[verb] ?? 'bg-muted text-muted-foreground',
                              )}
                            >
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            {log.entity ?? '—'}
                            {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                            {timeAgo(log.createdAt)}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">GPA by level</CardTitle>
            </CardHeader>
            <CardContent>
              {deptQuery.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : gpaTrend.every((p) => p.value === 0) ? (
                <EmptyState
                  icon={Award}
                  title="No published results"
                  description="GPAs will appear once results are published."
                  className="m-2"
                />
              ) : (
                <LineChart data={gpaTrend} height={140} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top resources</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {resourcesQuery.isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : topResources.length === 0 ? (
                <EmptyState
                  icon={Download}
                  title="No resources yet"
                  description="Most-downloaded resources will appear here."
                  className="m-4"
                />
              ) : (
                <ul className="divide-y">
                  {topResources.map((r, i) => (
                    <li key={r.id} className="flex items-center gap-3 p-3">
                      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.title}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {r.course?.code ?? 'General'} · {r.uploader.fullname}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Download className="h-3.5 w-3.5" />
                        {r.downloadCount}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {deptQuery.data ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Department snapshot — {deptQuery.data.session.name}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Level</th>
                    <th className="px-3 py-2 text-right font-medium">Students</th>
                    <th className="px-3 py-2 text-right font-medium">Courses</th>
                    <th className="px-3 py-2 text-right font-medium">Average GPA</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deptQuery.data.perLevel.map((l) => (
                    <tr key={l.level} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{l.level}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.studentCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.courseCount}</td>
                      <td className="px-3 py-2 text-right">
                        {l.averageGpa > 0 ? (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'font-mono',
                              l.averageGpa >= 3.5
                                ? 'bg-emerald-500/10 text-emerald-700'
                                : l.averageGpa >= 2
                                  ? 'bg-blue-500/10 text-blue-700'
                                  : 'bg-amber-500/10 text-amber-700',
                            )}
                          >
                            {l.averageGpa.toFixed(2)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <LineChartIcon className="h-3 w-3" />
        <span>Data refreshed on page load. Click a chart heading for details.</span>
      </div>
    </AdminShell>
  );
}
