'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronRight,
  FileText,
  Megaphone,
  Pin,
  Upload,
  Users,
} from 'lucide-react';

import { LecturerShell } from '@/components/layout/lecturer-shell';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from '@/components/ui/skeletons';
import { BarChart } from '@/components/ui/charts';
import { EmptyState } from '@/components/ui/empty-state';
import dynamic from 'next/dynamic';

const FeedbackSurveyModal = dynamic(
  () => import('@/components/feedback-survey-modal').then((mod) => mod.FeedbackSurveyModal),
  { ssr: false }
);
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';

interface Course {
  id: string;
  code: string;
  title: string;
  level: 'L100' | 'L200' | 'L300' | 'L400' | 'L500';
  semester: 'FIRST' | 'SECOND';
  creditUnits: number;
  departmentId: string;
}

interface MyCoursesResponse {
  session: { id: string; name: string; isCurrent: boolean };
  courses: Course[];
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; fullname: string; avatarUrl: string | null };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  unreadCount: number;
  notifications: Notification[];
}

interface CourseEnrollmentResponse {
  course: { id: string; code: string; title: string };
  session: { id: string; name: string };
  count: number;
  students: Array<{ id: string; fullname: string; matricNumber: string }>;
}

interface Resource {
  id: string;
  title: string;
  type: string;
  downloadCount: number;
  createdAt: string;
  course: { id: string; code: string; title: string } | null;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function formatTimeAgo(d: string): string {
  const ts = new Date(d).getTime();
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

function greeting(name: string): string {
  const hour = new Date().getHours();
  let displayName = name;
  const parts = name.split(/\s+/).filter(Boolean);
  
  if (parts.length > 0) {
    const salutations = ['dr', 'dr.', 'prof', 'prof.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.'];
    const firstLower = parts[0].toLowerCase();
    
    if (salutations.includes(firstLower)) {
      displayName = parts.length > 1 ? `${parts[0]} ${parts[1]}` : name;
    } else {
      displayName = parts[0];
    }
  }

  if (hour < 12) return `Good morning, ${displayName}`;
  if (hour < 17) return `Good afternoon, ${displayName}`;
  return `Good evening, ${displayName}`;
}

export default function LecturerDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [activeCoursePage, setActiveCoursePage] = useState(0);

  const coursesQuery = useQuery({
    queryKey: ['courses', 'lecturer', 'mine'],
    queryFn: async () => api.get<MyCoursesResponse>('/courses/lecturer/mine'),
  });

  const announcementsQuery = useQuery({
    queryKey: ['announcements', 'all'],
    queryFn: async () => {
      const res = await api.get<Announcement[] | { data: Announcement[] }>('/announcements');
      return Array.isArray(res) ? res : res.data;
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'mine', 'lecturer'],
    queryFn: async () => api.get<NotificationsResponse>('/notifications/mine'),
    staleTime: 30_000,
  });

  const resourcesQuery = useQuery({
    queryKey: ['resources', 'mine'],
    queryFn: async () => {
      const data = await api.get<Paginated<Resource>>('/resources?limit=5');
      return data.data;
    },
  });

  // Fetch enrollment counts for each assigned course
  const enrollmentQueries = useQuery({
    queryKey: ['enrollments', 'counts', coursesQuery.data?.courses.map((c) => c.id).join(',')],
    queryFn: async () => {
      if (!coursesQuery.data) return {} as Record<string, number>;
      const results = await Promise.all(
        coursesQuery.data.courses.map((c) =>
          api
            .get<CourseEnrollmentResponse>(`/enrollments/course/${c.id}`)
            .then((r) => [c.id, r.count] as const)
            .catch(() => [c.id, 0] as const),
        ),
      );
      return Object.fromEntries(results);
    },
    enabled: !!coursesQuery.data,
  });

  const totals = useMemo(() => {
    const counts: Record<string, number> = enrollmentQueries.data ?? {};
    const totalStudents = Object.values(counts).reduce((a: number, b: number) => a + b, 0);
    const assignedCourses = coursesQuery.data?.courses.length ?? 0;
    const uploadedResources = resourcesQuery.data?.length ?? 0;
    const pendingUploads = 0;
    return { assignedCourses, totalStudents, uploadedResources, pendingUploads };
  }, [coursesQuery.data, enrollmentQueries.data, resourcesQuery.data]);

  const session = coursesQuery.data?.session;
  const courses = coursesQuery.data?.courses ?? [];
  const announcements = announcementsQuery.data ?? [];
  const notifications = notificationsQuery.data?.notifications ?? [];

  // Chunk assigned courses into groups of 4 (for 2x2 layouts)
  const courseChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < courses.length; i += 4) {
      chunks.push(courses.slice(i, i + 4));
    }
    return chunks;
  }, [courses]);

  const handleCourseScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const pageIndex = Math.round(container.scrollLeft / container.clientWidth);
    setActiveCoursePage(pageIndex);
  };

  return (
    <LecturerShell>
      <PageHeader
        title={greeting(user?.fullname ?? 'Lecturer')}
        subtitle={
          session
            ? `Session ${session.name} · ${courses.length} assigned course${courses.length === 1 ? '' : 's'}`
            : 'Loading your dashboard…'
        }
      />

      {/* Quick stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Assigned courses" value={totals.assignedCourses} icon={BookOpen} />
        <StatCard label="Total students" value={totals.totalStudents} icon={Users} />
        <StatCard label="Uploaded resources" value={totals.uploadedResources} icon={Upload} />
        <StatCard label="Pending uploads" value={totals.pendingUploads} icon={BarChart3} />
      </div>

      {/* Main Responsive Grid Container */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-flow-row-dense">
        {/* Assigned courses (col-span-2) */}
        <Card className="md:col-span-2 lg:col-span-2 border border-border/40 shadow-sm flex flex-col justify-between">
          <CardHeader className="py-3 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Assigned Courses</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Courses you are instructing this semester.</p>
              </div>
              <Link
                href="/lecturer/courses"
                className="text-xs font-semibold text-primary hover:underline hover:text-indigo-600 transition"
              >
                Manage Courses
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-3 flex-1 flex flex-col justify-center">
            {coursesQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : courses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses assigned"
                description="Contact your department admin to be assigned courses for this session."
                className="m-0 border-0 bg-transparent p-3"
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
                      {chunk.map((c) => {
                        const count = enrollmentQueries.data?.[c.id] ?? 0;
                        return (
                          <Link
                            key={c.id}
                            href="/lecturer/courses"
                            className="flex flex-col justify-between rounded-xl border bg-card/60 p-3 transition hover:border-primary/40 hover:shadow-sm"
                          >
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                                {c.code}
                              </span>
                              <h3 className="mt-0.5 line-clamp-2 text-xs font-semibold leading-tight text-foreground">
                                {c.title}
                              </h3>
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-border/30 pt-1.5 text-[11px] text-muted-foreground">
                              <span>{count} Student{count === 1 ? '' : 's'}</span>
                              <Badge variant="secondary" className="text-[9px] py-0 px-1 font-semibold bg-muted/60 text-muted-foreground">
                                {c.level}
                              </Badge>
                            </div>
                          </Link>
                        );
                      })}
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

        {/* Performance Overview (col-span-1) */}
        <Card className="border border-border/40 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BarChart3 className="h-4 w-4 text-primary" />
              Performance overview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center p-4">
            {coursesQuery.isLoading ? (
              <ChartSkeleton height={160} />
            ) : courses.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No course data yet. Results will appear here once uploaded.
              </p>
            ) : (
              <div className="space-y-2">
                <BarChart
                  data={courses.slice(0, 5).map((c) => ({ label: c.code, value: 0 }))}
                  height={140}
                />
                <p className="pt-2 text-center text-[10px] text-muted-foreground">
                  Average score per course (populates after results are uploaded)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Uploads (col-span-1) */}
        <Card className="border border-border/40 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Upload className="h-4 w-4 text-primary" />
              Recent uploads
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center p-2">
            {resourcesQuery.isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !resourcesQuery.data || resourcesQuery.data.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                No resources uploaded yet.
              </p>
            ) : (
              <div className="divide-y">
                {resourcesQuery.data.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.course?.code ?? '—'} · {formatTimeAgo(r.createdAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {r.downloadCount} dl
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Announcements (col-span-1) */}
        <Card className="border border-border/40 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Megaphone className="h-4 w-4 text-primary" />
              Recent announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center p-2">
            {announcementsQuery.isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                No announcements yet.
              </p>
            ) : (
              <div className="space-y-2 p-2">
                {announcements.slice(0, 3).map((a) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <p className="line-clamp-1 text-sm font-semibold">{a.title}</p>
                      {a.isPinned ? <Pin className="h-3 w-3 text-primary" /> : null}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {a.author.fullname} · {formatTimeAgo(a.createdAt)}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications (col-span-1) */}
        <Card className="border border-border/40 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center p-2">
            {notificationsQuery.isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">All caught up.</p>
            ) : (
              <div className="space-y-1.5 p-2">
                {notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-2 rounded-md p-2 ${
                      n.isRead ? '' : 'bg-primary/5 border-l-2 border-primary'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-medium">{n.title}</p>
                      <p className="line-clamp-1 text-[10px] text-muted-foreground">{n.message}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatTimeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 hidden">
        <Button asChild>
          <Link href={`/lecturer/forum`}>Forum</Link>
        </Button>
      </div>
      <FeedbackSurveyModal />
    </LecturerShell>
  );
}
