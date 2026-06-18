'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Award,
  BarChart3,
  Printer,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

import { StudentShell } from '@/components/layout/student-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart } from '@/components/ui/charts';
import { EmptyState } from '@/components/ui/empty-state';
import { ResultSlip } from '@/components/print';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import type { ResultStatus, Semester } from '@eduportal/shared';

interface ResultRow {
  id: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
  status: ResultStatus;
  course: {
    id: string;
    code: string;
    title: string;
    creditUnits: number;
    level: string;
  };
  session: { id: string; name: string };
  semester: Semester;
}

interface SemesterSummary {
  sessionId: string;
  sessionName: string;
  semester: Semester;
  gpa: number;
  results: ResultRow[];
}

interface ResultsResponse {
  cgpa: number;
  semesters: SemesterSummary[];
}

interface Session {
  id: string;
  name: string;
  isCurrent: boolean;
}

const GRADE_COLORS: Record<string, string> = {
  A: '#10b981',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#f97316',
  E: '#ef4444',
  F: '#b91c1c',
};

function getSessionLevel(results: ResultRow[]): string {
  if (results.length === 0) return '';
  const levels = results.map((r) => r.course.level).filter(Boolean);
  if (levels.length === 0) return '';
  const numericLevels = levels.map((l) => {
    const match = l.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  });
  const maxLevel = Math.max(...numericLevels);
  return maxLevel > 0 ? `${maxLevel}L` : '';
}

export default function StudentResultsPage() {
  const user = useAuthStore((s) => s.user);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<Semester>('FIRST');

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => api.get<Session[]>('/sessions'),
  });

  const resultsQuery = useQuery({
    queryKey: ['results', 'mine'],
    queryFn: async () => api.get<ResultsResponse>('/results/mine'),
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => api.get<Array<{ id: string; name: string; code: string }>>('/departments'),
  });

  const departmentName = departmentsQuery.data?.find((d) => d.id === user?.departmentId)?.name;

  // Resolve the current session ID or fallback to the first session in list
  const currentSessionId = useMemo(() => {
    const list = sessionsQuery.data ?? [];
    const current = list.find((s) => s.isCurrent);
    if (current) return current.id;
    if (list.length > 0) return list[0].id;
    return '';
  }, [sessionsQuery.data]);

  const activeSessionId = selectedSession || currentSessionId;

  // Build the list of session options with levels dynamically formatted
  const sessionOptions = useMemo(() => {
    const list = sessionsQuery.data ?? [];
    const semesters = resultsQuery.data?.semesters ?? [];
    return list.map((s) => {
      const semResults = semesters.filter((sem) => sem.sessionId === s.id).flatMap((sem) => sem.results);
      let level = '';
      if (semResults.length > 0) {
        level = getSessionLevel(semResults);
      } else if (s.isCurrent && user?.level) {
        const match = user.level.match(/\d+/);
        level = match ? `${match[0]}L` : user.level;
      }
      return {
        value: s.id,
        label: level ? `${level} · ${s.name} session` : `${s.name} session`,
      };
    });
  }, [resultsQuery.data, sessionsQuery.data, user]);

  const filtered = useMemo(() => {
    const all = resultsQuery.data?.semesters ?? [];
    return all.filter((s) => {
      if (s.sessionId !== activeSessionId) return false;
      if (s.semester !== selectedSemester) return false;
      return true;
    });
  }, [resultsQuery.data, activeSessionId, selectedSemester]);

  const rows = useMemo(() => filtered.flatMap((s) => s.results), [filtered]);

  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    rows.forEach((r) => {
      const g = r.grade?.toUpperCase();
      if (g in counts) counts[g] += 1;
    });
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      color: GRADE_COLORS[label] ?? '#6b7280',
    }));
  }, [rows]);

  const totalCreditUnits = useMemo(
    () => rows.reduce((acc, r) => acc + (r.course.creditUnits ?? 0), 0),
    [rows],
  );

  const semesterGpa = useMemo(() => {
    if (filtered.length === 0) return 0;
    const totalWeighted = filtered.reduce(
      (acc, s) =>
        acc +
        s.results.reduce((a, r) => a + r.gradePoint * r.course.creditUnits, 0),
      0,
    );
    const totalUnits = filtered.reduce(
      (acc, s) => acc + s.results.reduce((a, r) => a + r.course.creditUnits, 0),
      0,
    );
    return totalUnits === 0 ? 0 : totalWeighted / totalUnits;
  }, [filtered]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };



  const activeOptionLabel = sessionOptions.find((opt) => opt.value === activeSessionId)?.label ?? '';

  return (
    <StudentShell>
      {/* Title block */}
      <div className="print:hidden">
        <PageHeader
          title="Academic results"
          subtitle="View published results for each session and semester."
        />
      </div>

      {/* Selectors Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 print:hidden bg-card border border-border/40 p-3 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Select Dropdown */}
          <Select value={activeSessionId || undefined} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-[260px] bg-background">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {sessionOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Semesters Tabs Bar */}
          <div className="inline-flex rounded-xl border bg-muted/20 p-1">
            {(['FIRST', 'SECOND'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSemester(s)}
                className={cn(
                  'rounded-lg px-4 py-1.5 text-xs font-semibold transition-all duration-200',
                  selectedSemester === s
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                )}
              >
                {s === 'FIRST' ? 'First Semester' : 'Second Semester'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Print Button */}
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 font-semibold rounded-xl bg-background shadow-xs hover:bg-muted/40">
            <Printer className="h-4 w-4" />
            Print slip
          </Button>
        </div>
      </div>

      {/* Performance Summary (Horizontal on desktop, stacked on mobile) */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 print:hidden">
        {/* Semester GPA */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Semester GPA</span>
            <p className="text-2xl font-black text-foreground tabular-nums mt-0.5">{semesterGpa.toFixed(2)}</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Award className="h-5 w-5" />
          </span>
        </div>
        
        {/* Cumulative GPA (CGPA) */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cumulative GPA (CGPA)</span>
            <p className="text-2xl font-black text-foreground tabular-nums mt-0.5">
              {(resultsQuery.data?.cgpa ?? 0).toFixed(2)}
            </p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </span>
        </div>

        {/* Semester Credits */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Semester Credits</span>
            <p className="text-2xl font-black text-foreground tabular-nums mt-0.5">{totalCreditUnits}</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600">
            <BarChart3 className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3 print:hidden">
        
        {/* Left: Results Table Card (Spans 2 columns) */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border border-border/40 shadow-sm">
            <CardHeader className="border-b border-border/30 pb-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Semester Results</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing results for {selectedSemester === 'FIRST' ? 'First Semester' : 'Second Semester'} of{' '}
                  <span className="font-semibold text-foreground">{activeOptionLabel.split(' · ').pop() ?? 'Selected Session'}</span>
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {resultsQuery.isLoading ? (
                <div className="space-y-2.5">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : rows.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No results found"
                  description="When your lecturers publish results for this semester, they will appear here."
                  className="py-12 border-0 bg-transparent"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 text-left text-xs uppercase tracking-wider text-muted-foreground pb-2">
                        <th className="py-2.5 font-bold">Code</th>
                        <th className="py-2.5 font-bold">Title</th>
                        <th className="py-2.5 text-right font-bold hidden md:table-cell">CA</th>
                        <th className="py-2.5 text-right font-bold hidden md:table-cell">Exam</th>
                        <th className="py-2.5 text-right font-bold">Total</th>
                        <th className="py-2.5 text-center font-bold">Grade</th>
                        <th className="py-2.5 text-right font-bold hidden md:table-cell">GP</th>
                        <th className="py-2.5 text-right font-bold hidden md:table-cell">Units</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {rows.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/15 transition-colors">
                          <td className="py-3 font-semibold text-primary">{r.course.code}</td>
                          <td className="py-3 font-medium text-foreground">{r.course.title}</td>
                          <td className="py-3 text-right tabular-nums font-medium text-muted-foreground hidden md:table-cell">{r.caScore.toFixed(1)}</td>
                          <td className="py-3 text-right tabular-nums font-medium text-muted-foreground hidden md:table-cell">{r.examScore.toFixed(1)}</td>
                          <td className="py-3 text-right font-bold tabular-nums text-foreground">
                            {r.totalScore.toFixed(1)}
                          </td>
                          <td className="py-3 text-center">
                            <GradeBadge grade={r.grade} />
                          </td>
                          <td className="py-3 text-right tabular-nums font-semibold text-foreground hidden md:table-cell">{r.gradePoint.toFixed(1)}</td>
                          <td className="py-3 text-right tabular-nums font-medium text-muted-foreground hidden md:table-cell">{r.course.creditUnits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary, Analytics CTA, and Grade Distribution Cards */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Analytics Banner/CTA Card */}
          <Card className="border border-primary/20 bg-gradient-to-br from-primary/[0.03] to-indigo-500/[0.03] shadow-sm relative overflow-hidden">
            <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
              <div className="min-w-0">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary">Advanced Stats</span>
                <h3 className="mt-1 text-sm font-bold text-foreground">Results Analytics</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Analyze your performance trends over time, view credit breakdowns, and monitor your progress history.
                </p>
              </div>
              <Button asChild size="sm" className="w-full gap-1.5 font-bold shadow-sm rounded-xl">
                <Link href="/student/results/analytics">
                  View analytics breakdown
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Grade Distribution Widget */}
          {rows.length > 0 && (
            <Card className="border border-border/40 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <PieChart
                  data={gradeDistribution.filter((g) => g.value > 0)}
                  size={150}
                  centerLabel="Total"
                  centerValue={rows.length}
                />
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Printing Result Slip Support */}
      {user && (
        <ResultSlip
          student={user}
          allSemesters={resultsQuery.data?.semesters || []}
          activeSessionId={activeSessionId}
          selectedSemester={selectedSemester}
          sessions={sessionsQuery.data || []}
          departmentName={departmentName}
        />
      )}
    </StudentShell>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const color = GRADE_COLORS[grade?.toUpperCase() ?? ''] ?? '#6b7280';
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white shadow-xs"
      style={{ backgroundColor: color }}
    >
      {grade}
    </span>
  );
}
