'use client';

import { useMemo, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/ui/charts';
import { EmptyState } from '@/components/ui/empty-state';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

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
  const [activeCoursePage, setActiveCoursePage] = useState(0);

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
    queryFn: async () => api.get<Announcement[]>('/announcements'),
  });

  const resourcesQuery = useQuery({
    queryKey: ['resources', 'recent'],
    queryFn: async () => api.get<Paginated<Resource>>('/resources?limit=4'),
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

  // Chunk enrolled courses into groups of 4 (for 2x2 layouts)
  const courseChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < enrolledCourses.length; i += 4) {
      chunks.push(enrolledCourses.slice(i, i + 4));
    }
    return chunks;
  }, [enrolledCourses]);

  const handleCourseScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const pageIndex = Math.round(container.scrollLeft / container.clientWidth);
    setActiveCoursePage(pageIndex);
  };

  return (
    <StudentShell>
      {/* Hello Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-indigo-700 p-6 text-primary-foreground shadow-md sm:p-8"
      >
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary-foreground/80 font-bold">
              {formatDate(new Date())}
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl tracking-tight">
              {greeting(firstName)} <span aria-hidden>👋</span>
            </h1>
            <p className="mt-1 text-sm text-primary-foreground/80 font-medium">
              {user?.level ? `${user.level.replace('L', 'Level ')} · ` : ''}
              {enrollmentsQuery.data?.session?.name ?? 'Current session'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button asChild size="sm" variant="secondary" className="bg-white/15 text-primary-foreground hover:bg-white/25 border-0 font-medium">
              <Link href="/student/courses">
                <Plus className="h-4 w-4" />
                Register courses
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Responsive Grid Container */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Main Content Area (Spans 2 columns on lg screens) */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* GPA snapshot & At a Glance row */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            
            {/* GPA snapshot Card */}
            <Card className="border border-border/40 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    GPA snapshot
                  </CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
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
                      <Badge variant="secondary" className="gap-1 text-xs bg-primary/10 text-primary border-primary/20 font-bold">
                        <TrendingUp className="h-3 w-3" />
                        CGPA
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground font-medium">
                      Current semester: <span className="font-semibold text-foreground">{currentGpa.toFixed(2)}</span>
                    </p>
                    <div className="mt-3">
                      <Sparkline data={gradeSparkline} height={36} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* At a glance Card (Shrinked & Horizontal layout) */}
            <Card className="border border-border/40 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    At a glance
                  </CardTitle>
                  <Compass className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/20 p-3 text-center transition hover:border-primary/20 hover:bg-muted/40">
                    <BookOpen className="h-5 w-5 text-primary shrink-0" />
                    <span className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Registered</span>
                    <span className="mt-0.5 text-base font-bold tabular-nums text-foreground">{enrolledCourses.length}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/20 p-3 text-center transition hover:border-primary/20 hover:bg-muted/40">
                    <GraduationCap className="h-5 w-5 text-primary shrink-0" />
                    <span className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Credits</span>
                    <span className="mt-0.5 text-base font-bold tabular-nums text-foreground">{totalCredits}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/20 p-3 text-center transition hover:border-primary/20 hover:bg-muted/40">
                    <Bell className="h-5 w-5 text-primary shrink-0" />
                    <span className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Unread</span>
                    <span className="mt-0.5 text-base font-bold tabular-nums text-foreground">{unreadCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registered Courses widget (2x2 Grid of Cards with Horizontal snap scrolling) */}
          <Card className="border border-border/40 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Registered Courses</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Your current study schedule for this semester.</p>
                </div>
                <Link
                  href="/student/courses"
                  className="text-xs font-semibold text-primary hover:underline hover:text-indigo-600 transition"
                >
                  Manage Courses
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {enrollmentsQuery.isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
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
                <div className="space-y-4">
                  <div
                    className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none"
                    onScroll={handleCourseScroll}
                    style={{ scrollBehavior: 'smooth' }}
                  >
                    {courseChunks.map((chunk, chunkIdx) => (
                      <div
                        key={chunkIdx}
                        className="grid grid-cols-2 gap-3 min-w-full shrink-0 snap-center"
                      >
                        {chunk.map((e) => (
                          <div
                            key={e.id}
                            className="flex flex-col justify-between rounded-xl border bg-card/60 p-4 transition hover:border-primary/40 hover:shadow-sm"
                          >
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                {e.course.code}
                              </span>
                              <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-tight text-foreground">
                                {e.course.title}
                              </h3>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5 text-xs text-muted-foreground">
                              <span>{e.course.creditUnits} Units</span>
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold bg-muted/60 text-muted-foreground">
                                {e.course.level}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {courseChunks.length > 1 && (
                    <div className="flex justify-center gap-1.5">
                      {courseChunks.map((_, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            activeCoursePage === idx ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Announcements & Recent resources list side-by-side */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            
            {/* Announcements Card */}
            <Card className="border border-border/40 shadow-sm">
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
                    <div key={a.id} className="rounded-lg border bg-card p-3 shadow-sm hover:border-primary/20 transition">
                      <div className="flex items-start gap-2">
                        {a.isPinned && <Pin className="mt-0.5 h-3.5 w-3.5 text-primary shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium text-foreground">{a.title}</p>
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

            {/* Recent resources Card */}
            <Card className="border border-border/40 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Recent resources
                  </CardTitle>
                  <Link
                    href="/student/resources"
                    className="text-xs font-semibold text-primary hover:underline transition"
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
                      description="Materials will appear here once uploaded."
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
                      className="group flex flex-col rounded-xl border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        <span>{r.type}</span>
                        <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100 text-primary" />
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs font-medium text-foreground leading-snug">{r.title}</p>
                      {r.course && (
                        <p className="mt-auto pt-1 text-[9px] font-bold text-primary uppercase tracking-wider">
                          {r.course.code}
                        </p>
                      )}
                    </a>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Area (Spans 1 column on all screens) */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Quick Actions Card */}
          <Card className="border border-border/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              <ActionTile href="/student/courses" icon={BookOpen} label="Register" />
              <ActionTile href="/student/results" icon={Award} label="Results" />
              <ActionTile href="/student/resources" icon={FileText} label="Resources" />
            </CardContent>
          </Card>

          {/* Latest Alerts Card */}
          <Card className="border border-border/40 shadow-sm">
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
                    className="flex items-start gap-2 rounded-lg border bg-card p-2.5 shadow-sm hover:border-primary/20 transition"
                  >
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-semibold text-foreground">{n.title}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {n.message}
                      </p>
                    </div>
                    <span className="shrink-0 text-[9px] text-muted-foreground font-medium">
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
      className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center text-xs font-semibold transition hover:border-primary/40 hover:bg-muted/40 shadow-sm hover:shadow-md"
    >
      <Icon className="h-5 w-5 text-primary shrink-0" />
      {label}
    </Link>
  );
}

function EmptyGpa() {
  return (
    <div className="space-y-2">
      <p className="text-3xl font-semibold text-muted-foreground">—</p>
      <p className="text-xs text-muted-foreground font-medium">
        No published results yet. CGPA will appear once your lecturers publish results.
      </p>
    </div>
  );
}
