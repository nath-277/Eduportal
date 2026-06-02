'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Award, BookOpen, GraduationCap } from 'lucide-react';

import { AdminShell } from '@/components/layout/admin-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, LineChart, PieChart } from '@/components/ui/charts';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface DepartmentAnalytics {
  session: { id: string; name: string };
  perLevel: Array<{
    level: string;
    studentCount: number;
    courseCount: number;
    averageGpa: number;
  }>;
}

interface Course {
  id: string;
  code: string;
  title: string;
  level: 'L100' | 'L200' | 'L300' | 'L400' | 'L500';
  semester: 'FIRST' | 'SECOND';
}

interface ResultRow {
  id: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
  isPublished: boolean;
}

interface CourseResultsResponse {
  course: { id: string; code: string; title: string };
  session: { id: string; name: string };
  results: ResultRow[];
}

const LEVEL_COLORS: Record<string, string> = {
  L100: 'hsl(271 91% 65%)',
  L200: 'hsl(189 94% 43%)',
  L300: 'hsl(217 91% 60%)',
  L400: 'hsl(160 84% 39%)',
  L500: 'hsl(24 95% 53%)',
};

const GRADE_COLORS: Record<string, string> = {
  A: 'hsl(160 84% 39%)',
  B: 'hsl(189 94% 43%)',
  C: 'hsl(217 91% 60%)',
  D: 'hsl(40 90% 50%)',
  E: 'hsl(28 80% 50%)',
  F: 'hsl(0 80% 55%)',
};

export default function AdminAnalyticsPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const deptQuery = useQuery({
    queryKey: ['analytics', 'department'],
    queryFn: async () => api.get<DepartmentAnalytics>('/analytics/department'),
  });

  const coursesQuery = useQuery({
    queryKey: ['courses', 'all'],
    queryFn: async () => api.get<Course[]>('/courses'),
  });

  const activeCourseId = selectedCourseId ?? coursesQuery.data?.[0]?.id ?? null;
  const activeCourse = coursesQuery.data?.find((c) => c.id === activeCourseId);

  const resultsQuery = useQuery({
    queryKey: ['results', 'admin', 'course', activeCourseId],
    queryFn: async () => api.get<CourseResultsResponse>(`/results/course/${activeCourseId}`),
    enabled: !!activeCourseId,
  });

  const levelData = useMemo(() => {
    if (!deptQuery.data) return { students: [], courses: [], gpa: [] };
    return {
      students: deptQuery.data.perLevel.map((l) => ({
        label: l.level,
        value: l.studentCount,
        color: LEVEL_COLORS[l.level] ?? 'hsl(var(--primary))',
      })),
      courses: deptQuery.data.perLevel.map((l) => ({
        label: l.level,
        value: l.courseCount,
        color: LEVEL_COLORS[l.level] ?? 'hsl(var(--primary))',
      })),
      gpa: deptQuery.data.perLevel.map((l) => ({ label: l.level, value: l.averageGpa })),
    };
  }, [deptQuery.data]);

  const gradeDistribution = useMemo(() => {
    if (!resultsQuery.data) return [];
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    for (const r of resultsQuery.data.results) {
      if (counts[r.grade] !== undefined) counts[r.grade] += 1;
    }
    return Object.entries(counts).map(([grade, count]) => ({
      label: grade,
      value: count,
      color: GRADE_COLORS[grade] ?? 'hsl(var(--primary))',
    }));
  }, [resultsQuery.data]);

  const passRate = useMemo(() => {
    if (!resultsQuery.data || resultsQuery.data.results.length === 0) return 0;
    const total = resultsQuery.data.results.length;
    const passing = resultsQuery.data.results.filter((r) => r.gradePoint >= 2).length;
    return Math.round((passing / total) * 100);
  }, [resultsQuery.data]);

  return (
    <AdminShell>
      <PageHeader
        title="System analytics"
        subtitle="Department-wide distribution and course-level performance."
        actions={
          coursesQuery.data && coursesQuery.data.length > 0 ? (
            <Select
              value={activeCourseId ?? ''}
              onValueChange={(v) => setSelectedCourseId(v)}
            >
              <SelectTrigger className="h-9 w-64">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {coursesQuery.data.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      <div className="mt-6 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Department overview
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Students per level</CardTitle>
              </CardHeader>
              <CardContent>
                {deptQuery.isLoading ? (
                  <Skeleton className="h-44 w-full" />
                ) : (
                  <BarChart data={levelData.students} height={160} unit="" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Courses per level</CardTitle>
              </CardHeader>
              <CardContent>
                {deptQuery.isLoading ? (
                  <Skeleton className="h-44 w-full" />
                ) : (
                  <BarChart data={levelData.courses} height={160} unit="" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average GPA per level</CardTitle>
              </CardHeader>
              <CardContent>
                {deptQuery.isLoading ? (
                  <Skeleton className="h-44 w-full" />
                ) : levelData.gpa.every((p) => p.value === 0) ? (
                  <EmptyState
                    icon={Award}
                    title="No published results"
                    description="GPAs appear once results are published."
                    className="m-2"
                  />
                ) : (
                  <LineChart data={levelData.gpa} height={160} />
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Result analytics
          </h2>
          {!activeCourseId ? (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icon={BookOpen}
                  title="No courses available"
                  description="Create a course to see result analytics."
                  className="m-6"
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 font-mono">
                  {activeCourse?.code}
                </Badge>
                <span>{activeCourse?.title}</span>
                {activeCourse ? <span>· {activeCourse.level} {activeCourse.semester.toLowerCase()}</span> : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total results"
                  value={resultsQuery.data?.results.length ?? 0}
                  icon={Activity}
                  description={resultsQuery.data ? 'this course' : 'loading'}
                />
                <StatCard
                  label="Published"
                  value={resultsQuery.data?.results.filter((r) => r.isPublished).length ?? 0}
                  icon={GraduationCap}
                  description="visible to students"
                />
                <StatCard
                  label="Pass rate"
                  value={passRate > 0 ? `${passRate}%` : '—'}
                  icon={Award}
                  description="grade ≥ C"
                />
                <StatCard
                  label="Average total"
                  value={
                    resultsQuery.data && resultsQuery.data.results.length > 0
                      ? Math.round(
                          resultsQuery.data.results.reduce((s, r) => s + r.totalScore, 0) /
                            resultsQuery.data.results.length,
                        )
                      : 0
                  }
                  icon={BookOpen}
                  description="out of 100"
                />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Grade breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {resultsQuery.isLoading ? (
                      <Skeleton className="h-44 w-full" />
                    ) : gradeDistribution.every((g) => g.value === 0) ? (
                      <EmptyState
                        icon={Award}
                        title="No results uploaded"
                        description="Upload scores to see grade distribution."
                        className="m-2"
                      />
                    ) : (
                      <PieChart
                        data={gradeDistribution}
                        size={160}
                        centerLabel="Total"
                        centerValue={resultsQuery.data?.results.length ?? 0}
                      />
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Score distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {resultsQuery.isLoading ? (
                      <Skeleton className="h-44 w-full" />
                    ) : (
                      <BarChart data={gradeDistribution} height={160} unit="" />
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </section>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        <span className={cn('font-mono')}>{deptQuery.data?.session.name ?? '—'}</span> · Data refreshes
        on page load.
      </p>
    </AdminShell>
  );
}
