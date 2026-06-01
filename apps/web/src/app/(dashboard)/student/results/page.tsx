'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  BarChart3,
  ChevronDown,
  Printer,
  TrendingUp,
} from 'lucide-react';

import { StudentShell } from '@/components/layout/student-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, LineChart } from '@/components/ui/charts';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import type { Semester } from '@eduportal/shared';

interface ResultRow {
  id: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
  course: {
    id: string;
    code: string;
    title: string;
    creditUnits: number;
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

export default function StudentResultsPage() {
  const user = useAuthStore((s) => s.user);
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<Semester | 'all'>('all');

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => api.get<Session[]>('/sessions'),
  });

  const resultsQuery = useQuery({
    queryKey: ['results', 'mine'],
    queryFn: async () => api.get<ResultsResponse>('/results/mine'),
  });

  const userId = meUserId(user?.id);

  const analyticsQuery = useQuery({
    queryKey: ['results', 'analytics', userId],
    queryFn: async () => {
      if (!userId) return null;
      return api.get<{
        student: { id: string; fullname: string; matricNumber: string; department: { name: string } };
        cgpa: number;
        trend: Array<{ session: string; semester: Semester; gpa: number; units: number }>;
      }>(`/results/analytics/student/${userId}`);
    },
    enabled: Boolean(userId),
  });

  const filtered = useMemo(() => {
    const all = resultsQuery.data?.semesters ?? [];
    return all.filter((s) => {
      if (selectedSession !== 'all' && s.sessionId !== selectedSession) return false;
      if (selectedSemester !== 'all' && s.semester !== selectedSemester) return false;
      return true;
    });
  }, [resultsQuery.data, selectedSession, selectedSemester]);

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

  const trendData = useMemo(() => {
    const trend = analyticsQuery.data?.trend ?? [];
    if (trend.length === 0) return [];
    return [...trend]
      .sort((a, b) => a.session.localeCompare(b.session))
      .map((t) => ({ label: t.session.split('/').pop() ?? t.session, value: t.gpa }));
  }, [analyticsQuery.data]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <StudentShell>
      <div className="print:hidden">
        <PageHeader
          title="Academic results"
          subtitle="Published results for all sessions, by semester."
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 print:hidden">
        <Select
          value={selectedSession}
          onChange={setSelectedSession}
          label="Session"
          options={[
            { value: 'all', label: 'All sessions' },
            ...(sessionsQuery.data ?? []).map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <div className="inline-flex rounded-md border bg-card p-0.5">
          {(['all', 'FIRST', 'SECOND'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedSemester(s)}
              className={cn(
                'rounded px-3 py-1.5 text-xs font-medium transition',
                selectedSemester === s
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s === 'all' ? 'All' : s === 'FIRST' ? 'First' : 'Second'}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print slip
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3 print:hidden">
        <SummaryTile
          label="Semester GPA"
          value={semesterGpa.toFixed(2)}
          icon={Award}
          loading={resultsQuery.isLoading}
        />
        <SummaryTile
          label="CGPA"
          value={(analyticsQuery.data?.cgpa ?? resultsQuery.data?.cgpa ?? 0).toFixed(2)}
          icon={TrendingUp}
          loading={resultsQuery.isLoading && analyticsQuery.isLoading}
        />
        <SummaryTile
          label="Total credits"
          value={String(totalCreditUnits)}
          icon={BarChart3}
          loading={resultsQuery.isLoading}
        />
      </div>

      <Card className="mt-6 print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent>
          {resultsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No results yet"
              description="When your lecturers publish results, they will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 font-medium">Code</th>
                    <th className="py-2 font-medium">Title</th>
                    <th className="py-2 text-right font-medium">CA</th>
                    <th className="py-2 text-right font-medium">Exam</th>
                    <th className="py-2 text-right font-medium">Total</th>
                    <th className="py-2 text-center font-medium">Grade</th>
                    <th className="py-2 text-right font-medium">GP</th>
                    <th className="py-2 text-right font-medium">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="py-2 font-medium text-primary">{r.course.code}</td>
                      <td className="py-2">{r.course.title}</td>
                      <td className="py-2 text-right tabular-nums">{r.caScore.toFixed(1)}</td>
                      <td className="py-2 text-right tabular-nums">{r.examScore.toFixed(1)}</td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {r.totalScore.toFixed(1)}
                      </td>
                      <td className="py-2 text-center">
                        <GradeBadge grade={r.grade} />
                      </td>
                      <td className="py-2 text-right tabular-nums">{r.gradePoint.toFixed(1)}</td>
                      <td className="py-2 text-right tabular-nums">{r.course.creditUnits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {rows.length > 0 ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grade distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={gradeDistribution} height={180} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CGPA trend</CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Trend data will appear once you have results across multiple sessions.
                </p>
              ) : (
                <LineChart data={trendData} height={180} />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <PrintableResultSlip
        user={user}
        results={rows}
        semesterGpa={semesterGpa}
        cgpa={analyticsQuery.data?.cgpa ?? resultsQuery.data?.cgpa ?? 0}
        totalUnits={totalCreditUnits}
      />
    </StudentShell>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          )}
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const color = GRADE_COLORS[grade?.toUpperCase() ?? ''] ?? '#6b7280';
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {grade}
    </span>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-md border bg-card pl-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function meUserId(id: string | undefined): string | undefined {
  return id;
}

function PrintableResultSlip({
  user,
  results,
  semesterGpa,
  cgpa,
  totalUnits,
}: {
  user: { fullname?: string; matricNumber?: string; level?: string } | null;
  results: ResultRow[];
  semesterGpa: number;
  cgpa: number;
  totalUnits: number;
}) {
  if (results.length === 0) return null;
  return (
    <div className="hidden print:block print:bg-white print:p-8 print:text-black">
      <div className="border-2 border-black p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">EduPortal — Result Slip</h1>
          <p className="mt-1 text-sm">Official academic transcript</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Student</p>
            <p>{user?.fullname}</p>
          </div>
          <div>
            <p className="font-semibold">Matric number</p>
            <p>{user?.matricNumber}</p>
          </div>
          <div>
            <p className="font-semibold">Level</p>
            <p>{user?.level?.replace('L', 'Level ')}</p>
          </div>
          <div>
            <p className="font-semibold">CGPA</p>
            <p className="text-lg font-semibold">{cgpa.toFixed(2)}</p>
          </div>
        </div>
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-2 text-left">Code</th>
              <th className="py-2 text-left">Title</th>
              <th className="py-2 text-right">Total</th>
              <th className="py-2 text-center">Grade</th>
              <th className="py-2 text-right">Units</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-b border-black/30">
                <td className="py-2 font-medium">{r.course.code}</td>
                <td className="py-2">{r.course.title}</td>
                <td className="py-2 text-right">{r.totalScore.toFixed(1)}</td>
                <td className="py-2 text-center font-semibold">{r.grade}</td>
                <td className="py-2 text-right">{r.course.creditUnits}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="py-2 text-right font-semibold">
                Total credit units
              </td>
              <td className="py-2 text-right font-semibold">{totalUnits}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="font-semibold">Semester GPA</p>
            <p className="text-lg font-semibold">{semesterGpa.toFixed(2)}</p>
          </div>
          <div>
            <p className="font-semibold">CGPA</p>
            <p className="text-lg font-semibold">{cgpa.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="border-t border-black pt-1">Course advisor</div>
          </div>
          <div>
            <div className="border-t border-black pt-1">Date</div>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-black/60">
          Generated by EduPortal · {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}
