'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Award,
  Bell,
  BookOpen,
  Clock,
  Compass,
  FileText,
  GraduationCap,
  Megaphone,
  Pin,
  Plus,
  TrendingUp,
} from 'lucide-react';

import { StudentShell } from '@/components/layout/student-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/ui/charts';
import { EmptyState } from '@/components/ui/empty-state';
import dynamic from 'next/dynamic';

const FeedbackSurveyModal = dynamic(
  () => import('@/components/feedback-survey-modal').then((mod) => mod.FeedbackSurveyModal),
  { ssr: false }
);
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';

interface ResultsResponse {
  cgpa: number;
  semesters: Array<{
    sessionId: string;
    sessionName: string;
    semester: 'FIRST' | 'SECOND';
    gpa: number;
    results: Array<{ id: string; totalScore: number; gradePoint: number; course: { creditUnits: number } }>;
  }>;
}

interface MyEnrollmentsResponse {
  session: { id: string; name: string; isCurrent: boolean };
  firstSemester: Array<{
    id: string;
    course: { id: string; code: string; title: string; creditUnits: number; level: string };
  }>;
  secondSemester: Array<{
    id: string;
    course: { id: string; code: string; title: string; creditUnits: number; level: string };
  }>;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; fullname: string; avatarUrl: string | null };
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
  course?: { id: string; code: string; title: string } | null;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface NotificationsResponse {
  unreadCount: number;
  notifications: Array<{ id: string; title: string; message: string; category: string; isRead: boolean; createdAt: string }>;
}

function greeting(name: string): string {
  const hour = new Date().getHours();
  const first = name.split(' ')[0] ?? name;
  if (hour < 12) return `Good morning, ${first}`;
  if (hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimeAgo(d: Date | string): string {
  const ts = new Date(d).getTime();
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.fullname.split(' ')[0] ?? 'there';

  const resultsQuery = useQuery({
    queryKey: ['results', 'mine'],
    queryFn: async () => api.get<ResultsResponse>('/results/mine'),
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['enrollments', 'mine'],
    queryFn: async () => api.get<MyEnrollmentsResponse>('/enrollments/mine'),
  });

  const announcementsQuery = useQuery({
    queryKey: ['announcements', 'list'],
    queryFn: async () => {
      const data = await api.get<Announcement[]>('/announcements');
      return data;
    },
  });

  const resourcesQuery = useQuery({
    queryKey: ['resources', 'recent'],
    queryFn: async () => {
      const data = await api.get<Paginated<Resource>>('/resources?limit=4');
      return data;
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'mine', 'student'],
    queryFn: async () => api.get<NotificationsResponse>('/notifications/mine'),
    staleTime: 30_000,
  });

  const enrolledCourses = useMemo(() => {
    const mine = enrollmentsQuery.data;
    if (!mine) return [];
    return [...mine.firstSemester, ...mine.secondSemester];
  }, [enrollmentsQuery.data]);

  const totalCredits = enrolledCourses.reduce(
    (acc, e) => acc + (e.course.creditUnits ?? 0),
    0,
  );

  const cgpa = resultsQuery.data?.cgpa ?? 0;
  const currentGpa = resultsQuery.data?.semesters?.[0]?.gpa ?? 0;
  const gradeSparkline = useMemo(() => {
    const semesters = resultsQuery.data?.semesters ?? [];
    if (semesters.length === 0) return [];
    return [...semesters]
      .sort((a, b) => a.sessionName.localeCompare(b.sessionName))
      .map((s) => s.gpa);
  }, [resultsQuery.data]);

  const announcements = (announcementsQuery.data ?? []).slice(0, 3);
  const resources = (resourcesQuery.data?.data ?? []).slice(0, 4);
  const notifications = (notificationsQuery.data?.notifications ?? []).slice(0, 5);
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  return (
    <StudentShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-indigo-700 p-6 text-primary-foreground shadow-md sm:p-8"
      >
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary-foreground/80">
              {formatDate(new Date())}
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              {greeting(firstName)} <span aria-hidden>👋</span>
            </h1>
            <p className="mt-1 text-sm text-primary-foreground/80">
              {user?.level ? `${user.level.replace('L', 'Level ')} · ` : ''}
              {enrollmentsQuery.data?.session?.name ?? 'Current session'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="secondary" className="bg-white/15 text-primary-foreground hover:bg-white/25">
              <Link href="/student/courses">
                <Plus className="h-4 w-4" />
                Register courses
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  GPA snapshot
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {resultsQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : resultsQuery.data?.semesters?.length === 0 ? (
                <EmptyGpa />
              ) : (
                <>
                  <div className="flex items-baseline gap-3">
                    <p className="text-4xl font-semibold tabular-nums">{cgpa.toFixed(2)}</p>
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <TrendingUp className="h-3 w-3" />
                      CGPA
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current semester: <span className="font-medium text-foreground">{currentGpa.toFixed(2)}</span>
                  </p>
                  <div className="mt-3">
                    <Sparkline data={gradeSparkline} height={36} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              <ActionTile href="/student/courses" icon={BookOpen} label="Register" />
              <ActionTile href="/student/results" icon={Award} label="Results" />
              <ActionTile href="/student/resources" icon={FileText} label="Resources" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Registered courses
                </CardTitle>
                <Link
                  href="/student/courses"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Manage
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {enrollmentsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : enrolledCourses.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No courses yet"
                  description="Start registration to see your courses here."
                  className="m-0 border-0 bg-transparent p-3"
                  action={
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link href="/student/courses">
                        <Plus className="h-3.5 w-3.5" />
                        Register now
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {enrolledCourses.map((e) => (
                    <div
                      key={e.id}
                      className="flex w-44 shrink-0 flex-col rounded-xl border bg-card p-3"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                        {e.course.code}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-sm font-medium">
                        {e.course.title}
                      </span>
                      <span className="mt-1 text-xs text-muted-foreground">
                        {e.course.creditUnits} units
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Announcements
                </CardTitle>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcementsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : announcements.length === 0 ? (
                <EmptyState
                  icon={Megaphone}
                  title="No announcements yet"
                  description="Departmental updates will appear here."
                  className="m-0 border-0 bg-transparent p-3"
                />
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-start gap-2">
                      {a.isPinned && <Pin className="mt-0.5 h-3.5 w-3.5 text-primary" />}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{a.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {a.body}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {a.author.fullname} · {formatTimeAgo(a.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  At a glance
                </CardTitle>
                <Compass className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <StatCard
                  label="Registered"
                  value={enrolledCourses.length}
                  icon={BookOpen}
                />
                <StatCard
                  label="Credit units"
                  value={totalCredits}
                  icon={GraduationCap}
                />
                <StatCard
                  label="Unread"
                  value={unreadCount}
                  icon={Bell}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Recent resources
                </CardTitle>
                <Link
                  href="/student/resources"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Browse
                </Link>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {resourcesQuery.isLoading ? (
                <div className="col-span-2 space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : resources.length === 0 ? (
                <div className="col-span-2">
                  <EmptyState
                    icon={FileText}
                    title="No resources yet"
                    description="Course materials will appear here once lecturers upload them."
                    className="m-0 border-0 bg-transparent p-4"
                  />
                </div>
              ) : (
                resources.map((r) => (
                  <a
                    key={r.id}
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col rounded-xl border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span>{r.type}</span>
                      <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-medium">{r.title}</p>
                    {r.course && (
                      <p className="mt-1 text-[10px] font-medium text-primary">
                        {r.course.code}
                      </p>
                    )}
                  </a>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Latest alerts
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {notificationsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : notifications.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="You're all caught up!"
                  description="New alerts will show up here."
                  className="m-0 border-0 bg-transparent p-3"
                />
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2 rounded-lg border bg-card p-2.5"
                  >
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{n.title}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {n.message}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <FeedbackSurveyModal />
    </StudentShell>
  );
}

function ActionTile({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center text-xs font-medium transition hover:border-primary/40 hover:bg-muted/40"
    >
      <Icon className="h-5 w-5 text-primary" />
      {label}
    </Link>
  );
}

function EmptyGpa() {
  return (
    <div className="space-y-2">
      <p className="text-3xl font-semibold text-muted-foreground">—</p>
      <p className="text-xs text-muted-foreground">
        No published results yet. CGPA will appear once your lecturers publish results.
      </p>
    </div>
  );
}
