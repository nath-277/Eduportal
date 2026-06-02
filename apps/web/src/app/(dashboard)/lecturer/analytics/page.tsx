'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  LineChart as LineChartIcon,
  Users,
} from 'lucide-react';

import { LecturerShell } from '@/components/layout/lecturer-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BarChart, LineChart } from '@/components/ui/charts';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  code: string;
  title: string;
  level: 'L100' | 'L200' | 'L300' | 'L400' | 'L500';
  semester: 'FIRST' | 'SECOND';
  creditUnits: number;
}

interface MyCoursesResponse {
  session: { id: string; name: string; isCurrent: boolean };
  courses: Course[];
}

interface ResultRow {
  id: string;
  studentId: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
  isPublished: boolean;
  student: { id: string; fullname: string; matricNumber: string };
}

interface CourseResultsResponse {
  course: { id: string; code: string; title: string; creditUnits: number };
  session: { id: string; name: string };
  results: ResultRow[];
}

const GRADE_ORDER: Array<{ key: string; label: string; color: string }> = [
  { key: 'A', label: 'A (70-100)', color: 'hsl(160 84% 39%)' },
  { key: 'B', label: 'B (60-69)', color: 'hsl(173 80% 40%)' },
  { key: 'C', label: 'C (50-59)', color: 'hsl(200 80% 50%)' },
  { key: 'D', label: 'D (45-49)', color: 'hsl(40 90% 50%)' },
  { key: 'E', label: 'E (40-44)', color: 'hsl(28 80% 50%)' },
  { key: 'F', label: 'F (0-39)', color: 'hsl(0 80% 55%)' },
];

type SortKey = 'matric' | 'name' | 'ca' | 'exam' | 'total' | 'grade';

export default function LecturerAnalyticsPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const coursesQuery = useQuery({
    queryKey: ['courses', 'lecturer', 'mine'],
    queryFn: async () => api.get<MyCoursesResponse>('/courses/lecturer/mine'),
  });

  const activeCourseId = selectedCourseId ?? coursesQuery.data?.courses[0]?.id ?? null;
  const activeCourse = coursesQuery.data?.courses.find((c) => c.id === activeCourseId);

  const resultsQuery = useQuery({
    queryKey: ['results', 'course', activeCourseId],
    queryFn: async () => api.get<CourseResultsResponse>(`/results/course/${activeCourseId}`),
    enabled: !!activeCourseId,
  });

  const distribution = useMemo(() => {
    if (!resultsQuery.data) return [];
    return GRADE_ORDER.map((g) => ({
      label: g.key,
      value: resultsQuery.data.results.filter((r) => r.grade === g.key).length,
      color: g.color,
    }));
  }, [resultsQuery.data]);

  const averages = useMemo(() => {
    if (!resultsQuery.data || resultsQuery.data.results.length === 0) {
      return { ca: 0, exam: 0, total: 0, count: 0 };
    }
    const rs = resultsQuery.data.results;
    const sum = rs.reduce(
      (acc, r) => ({
        ca: acc.ca + r.caScore,
        exam: acc.exam + r.examScore,
        total: acc.total + r.totalScore,
      }),
      { ca: 0, exam: 0, total: 0 },
    );
    const n = rs.length;
    return {
      ca: Math.round((sum.ca / n) * 10) / 10,
      exam: Math.round((sum.exam / n) * 10) / 10,
      total: Math.round((sum.total / n) * 10) / 10,
      count: n,
    };
  }, [resultsQuery.data]);

  const trend = useMemo(() => {
    if (!resultsQuery.data) return [];
    const sorted = [...resultsQuery.data.results].sort((a, b) => a.totalScore - b.totalScore);
    return sorted.map((r) => ({ label: r.student.matricNumber.slice(-3), value: r.totalScore }));
  }, [resultsQuery.data]);

  const sortedRows = useMemo(() => {
    if (!resultsQuery.data) return [];
    const rows = [...resultsQuery.data.results];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case 'matric':
          cmp = a.student.matricNumber.localeCompare(b.student.matricNumber);
          break;
        case 'name':
          cmp = a.student.fullname.localeCompare(b.student.fullname);
          break;
        case 'ca':
          cmp = a.caScore - b.caScore;
          break;
        case 'exam':
          cmp = a.examScore - b.examScore;
          break;
        case 'total':
          cmp = a.totalScore - b.totalScore;
          break;
        case 'grade':
          cmp = a.gradePoint - b.gradePoint;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [resultsQuery.data, sort, sortDir]);

  function toggleSort(k: SortKey) {
    if (sort === k) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(k);
      setSortDir('desc');
    }
  }

  return (
    <LecturerShell>
      <PageHeader
        title="Course analytics"
        subtitle="Score distributions and student performance across your courses."
        actions={
          coursesQuery.data && coursesQuery.data.courses.length > 0 ? (
            <select
              value={activeCourseId ?? ''}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {coursesQuery.data.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          ) : null
        }
      />

      {coursesQuery.isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !coursesQuery.data || coursesQuery.data.courses.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="p-0">
            <EmptyState
              icon={BookOpen}
              title="No courses assigned"
              description="You do not have any courses for the current session."
              className="m-6"
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {activeCourse ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700">
                {activeCourse.code}
              </Badge>
              <span className="font-mono">{activeCourse.level}</span>
              <span>·</span>
              <span className="capitalize">{activeCourse.semester.toLowerCase()} semester</span>
              <span>·</span>
              <span>{activeCourse.creditUnits} credit units</span>
              <span>·</span>
              <span>{coursesQuery.data.session.name}</span>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Students scored"
              value={averages.count}
              icon={Users}
              description={averages.count === 0 ? 'No results yet' : 'enrolled & graded'}
            />
            <StatCard
              label="Average CA"
              value={averages.ca}
              icon={LineChartIcon}
              description="out of 40"
            />
            <StatCard
              label="Average exam"
              value={averages.exam}
              icon={LineChartIcon}
              description="out of 60"
            />
            <StatCard
              label="Average total"
              value={averages.total}
              icon={Award}
              description="out of 100"
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grade distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {resultsQuery.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <BarChart data={distribution} height={180} unit="" />
                )}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {GRADE_ORDER.map((g) => (
                    <div key={g.key} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: g.color }}
                      />
                      {g.label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total score spread</CardTitle>
              </CardHeader>
              <CardContent>
                {resultsQuery.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : trend.length === 0 ? (
                  <EmptyState icon={LineChartIcon} title="No scores yet" description="Upload results to see a spread." className="m-2" />
                ) : (
                  <LineChart data={trend} height={180} />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Student performance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {resultsQuery.isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : sortedRows.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No results uploaded"
                  description="Once you upload scores, students will appear here."
                  action={
                    <Link
                      href={`/lecturer/results/upload?courseId=${activeCourseId}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
                    >
                      Upload results
                    </Link>
                  }
                  className="m-6"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <Th label="Matric" active={sort === 'matric'} dir={sortDir} onClick={() => toggleSort('matric')} />
                        <Th label="Name" active={sort === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                        <Th label="CA (40)" active={sort === 'ca'} dir={sortDir} onClick={() => toggleSort('ca')} numeric />
                        <Th label="Exam (60)" active={sort === 'exam'} dir={sortDir} onClick={() => toggleSort('exam')} numeric />
                        <Th label="Total" active={sort === 'total'} dir={sortDir} onClick={() => toggleSort('total')} numeric />
                        <Th label="Grade" active={sort === 'grade'} dir={sortDir} onClick={() => toggleSort('grade')} />
                        <th className="px-3 py-2 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortedRows.map((r) => (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.15 }}
                          className="hover:bg-muted/30"
                        >
                          <td className="px-3 py-2 font-mono text-xs">{r.student.matricNumber}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">
                                  {r.student.fullname
                                    .split(' ')
                                    .map((p) => p[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{r.student.fullname}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.caScore}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.examScore}</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.totalScore}</td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary" className={cn('font-mono', gradeTone(r.grade))}>
                              {r.grade}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {r.isPublished ? (
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700">Published</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">Draft</Badge>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </LecturerShell>
  );
}

function Th({
  label,
  active,
  dir,
  onClick,
  numeric,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  numeric?: boolean;
}) {
  return (
    <th className={cn('px-3 py-2 font-medium', numeric ? 'text-right' : 'text-left')}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 text-xs uppercase tracking-wide transition hover:text-foreground',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        {active ? (dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
      </button>
    </th>
  );
}

function gradeTone(g: string): string {
  switch (g) {
    case 'A':
      return 'bg-emerald-500/10 text-emerald-700';
    case 'B':
      return 'bg-teal-500/10 text-teal-700';
    case 'C':
      return 'bg-blue-500/10 text-blue-700';
    case 'D':
      return 'bg-amber-500/10 text-amber-700';
    case 'E':
      return 'bg-orange-500/10 text-orange-700';
    default:
      return 'bg-destructive/10 text-destructive';
  }
}
