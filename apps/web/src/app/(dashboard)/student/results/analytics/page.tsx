'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
} from 'lucide-react';

import { StudentShell } from '@/components/layout/student-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api';
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

const GRADE_COLORS: Record<string, string> = {
  A: '#10b981',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#f97316',
  E: '#ef4444',
  F: '#b91c1c',
};

function getAcademicStanding(cgpa: number): { label: string; tone: string } {
  if (cgpa >= 4.50) return { label: 'First Class Honors', tone: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
  if (cgpa >= 3.50) return { label: 'Second Class Upper', tone: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
  if (cgpa >= 2.40) return { label: 'Second Class Lower', tone: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
  if (cgpa >= 1.50) return { label: 'Third Class', tone: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
  return { label: 'Pass', tone: 'bg-red-500/10 text-red-600 border-red-500/20' };
}

export default function StudentResultsAnalyticsPage() {
  const resultsQuery = useQuery({
    queryKey: ['results', 'mine'],
    queryFn: async () => api.get<ResultsResponse>('/results/mine'),
  });

  const semesters = useMemo(() => {
    const list = resultsQuery.data?.semesters ?? [];
    // Sort in chronological order (oldest to newest)
    return [...list].sort((a, b) => {
      const sessionCompare = a.sessionName.localeCompare(b.sessionName);
      if (sessionCompare !== 0) return sessionCompare;
      return a.semester === 'FIRST' ? -1 : 1;
    });
  }, [resultsQuery.data]);

  // Compute running CGPA for each semester using a standard for loop
  const trendData = useMemo(() => {
    const result = [];
    let cumulativePoints = 0;
    let cumulativeUnits = 0;

    for (let i = 0; i < semesters.length; i++) {
      const s = semesters[i];
      const semesterUnits = s.results.reduce((acc, r) => acc + (r.course.creditUnits ?? 0), 0);
      const semesterPoints = s.results.reduce((acc, r) => acc + r.gradePoint * (r.course.creditUnits ?? 0), 0);
      
      cumulativePoints += semesterPoints;
      cumulativeUnits += semesterUnits;
      
      const runningCgpa = cumulativeUnits > 0 ? cumulativePoints / cumulativeUnits : 0;
      
      result.push({
        sessionName: s.sessionName,
        semester: s.semester,
        gpa: s.gpa,
        cgpa: runningCgpa,
        units: semesterUnits,
        label: `${s.sessionName.split('/').pop() ?? s.sessionName} (${s.semester === 'FIRST' ? 'S1' : 'S2'})`,
      });
    }
    return result;
  }, [semesters]);

  // Gather overall results
  const allResults = useMemo(() => semesters.flatMap((s) => s.results), [semesters]);

  // Calculate cumulative grade counts
  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    allResults.forEach((r) => {
      const g = r.grade?.toUpperCase();
      if (g in counts) counts[g] += 1;
    });
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      color: GRADE_COLORS[label] ?? '#6b7280',
    }));
  }, [allResults]);

  const totalCreditsEarned = useMemo(() => {
    // Sum credit units for courses passed (grade is not F)
    return allResults
      .filter((r) => r.grade?.toUpperCase() !== 'F')
      .reduce((acc, r) => acc + (r.course.creditUnits ?? 0), 0);
  }, [allResults]);

  const overallCgpa = resultsQuery.data?.cgpa ?? 0;
  const standing = getAcademicStanding(overallCgpa);

  return (
    <StudentShell>
      {/* Back to Results */}
      <div className="print:hidden mb-4">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 rounded-xl hover:bg-muted/40 font-semibold">
          <Link href="/student/results">
            <ArrowLeft className="h-4 w-4" />
            Back to Results
          </Link>
        </Button>
      </div>

      <div className="print:hidden">
        <PageHeader
          title="Results Analytics"
          subtitle="A comprehensive breakdown of your academic performance and trends over time."
        />
      </div>

      {resultsQuery.isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-80 w-full rounded-2xl" />
            <Skeleton className="h-60 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      ) : allResults.length === 0 ? (
        <div className="mt-6">
          <Card className="border border-border/40 shadow-sm">
            <CardContent className="py-16">
              <EmptyState
                icon={TrendingUp}
                title="No analytics available"
                description="Once your academic results are published, your trend graphs and grade distributions will generate here."
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Left: Trend Graph & Detailed Semester Table (Spans 2 columns) */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* GPA & CGPA Trend Chart */}
            <Card className="border border-border/40 shadow-sm">
              <CardHeader className="border-b border-border/30 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">GPA & CGPA Progression</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Tracking semester GPA against cumulative CGPA over time.</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-muted-foreground">Semester GPA</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-muted-foreground">Running CGPA</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <CustomTrendChart data={trendData} />
              </CardContent>
            </Card>

            {/* Performance History Table */}
            <Card className="border border-border/40 shadow-sm">
              <CardHeader className="border-b border-border/30 pb-3">
                <CardTitle className="text-base font-bold text-foreground">Semester Performance Log</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 text-left text-xs uppercase tracking-wider text-muted-foreground pb-2">
                        <th className="py-2.5 font-bold">Session</th>
                        <th className="py-2.5 font-bold">Semester</th>
                        <th className="py-2.5 text-right font-bold">GPA</th>
                        <th className="py-2.5 text-right font-bold">Running CGPA</th>
                        <th className="py-2.5 text-right font-bold">Credits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {trendData.map((t, idx) => (
                        <tr key={idx} className="hover:bg-muted/15 transition-colors">
                          <td className="py-3 font-semibold text-foreground">{t.sessionName}</td>
                          <td className="py-3 text-muted-foreground font-medium">
                            {t.semester === 'FIRST' ? 'First Semester' : 'Second Semester'}
                          </td>
                          <td className="py-3 text-right font-bold tabular-nums text-primary">
                            {t.gpa.toFixed(2)}
                          </td>
                          <td className="py-3 text-right font-bold tabular-nums text-emerald-600">
                            {t.cgpa.toFixed(2)}
                          </td>
                          <td className="py-3 text-right font-semibold text-muted-foreground tabular-nums">
                            {t.units}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right: Academic Standing & Cumulative Statistics (Spans 1 column) */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Standing Card */}
            <Card className="border border-border/40 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Academic Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 rounded-xl border bg-muted/10">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Overall CGPA</span>
                  <p className="text-4xl font-extrabold text-foreground tabular-nums mt-1">{overallCgpa.toFixed(2)}</p>
                  <Badge className={cn('mt-3 border text-xs font-semibold px-2.5 py-0.5 rounded-full', standing.tone)}>
                    {standing.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-xl bg-card">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Total Credits Earned</span>
                    <span className="text-lg font-bold text-foreground block mt-1 tabular-nums">{totalCreditsEarned}</span>
                  </div>
                  <div className="p-3 border rounded-xl bg-card">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Completed Semesters</span>
                    <span className="text-lg font-bold text-foreground block mt-1 tabular-nums">{semesters.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cumulative Grade Distribution */}
            <Card className="border border-border/40 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Cumulative Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Horizontal progress indicators for each grade */}
                <div className="space-y-2.5">
                  {gradeDistribution.map((g) => {
                    const pct = allResults.length > 0 ? (g.value / allResults.length) * 100 : 0;
                    return (
                      <div key={g.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                            <span>Grade {g.label}</span>
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {g.value} ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: g.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      )}
    </StudentShell>
  );
}

// Custom two-line Area & Line progression chart
function CustomTrendChart({ data, height = 240 }: { data: Array<{ label: string; gpa: number; cgpa: number }>; height?: number }) {
  if (data.length === 0) return null;

  const allValues = data.flatMap((d) => [d.gpa, d.cgpa]);
  const max = Math.max(5, ...allValues);
  const min = Math.min(0, ...allValues);
  const range = max - min || 1;
  const width = 500;
  const paddingX = 40;
  const paddingY = 20;
  const innerW = width - paddingX * 2;
  const innerH = 200 - paddingY * 2;

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(1, data.length - 1)) * innerW;
    const yGpa = paddingY + (1 - (d.gpa - min) / range) * innerH;
    const yCgpa = paddingY + (1 - (d.cgpa - min) / range) * innerH;
    return { x, yGpa, yCgpa, ...d };
  });

  const gpaPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.yGpa.toFixed(2)}`)
    .join(' ');

  const cgpaPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.yCgpa.toFixed(2)}`)
    .join(' ');

  // Area fill under CGPA trend (emerald)
  const cgpaArea = `${cgpaPath} L ${points[points.length - 1]?.x.toFixed(2) ?? 0} ${200 - paddingY} L ${points[0]?.x.toFixed(2) ?? 0} ${200 - paddingY} Z`;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} 200`}
        className="h-full w-full overflow-visible"
        aria-label="Academic CGPA trend"
      >
        <defs>
          {/* Gradient for CGPA area */}
          <linearGradient id="cgpa-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.0" />
          </linearGradient>
          <filter id="glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Y Axis Grid lines */}
        {Array.from({ length: 6 }).map((_, idx) => {
          const val = min + (idx / 5) * range;
          const y = paddingY + (1 - (val - min) / range) * innerH;
          return (
            <g key={idx} className="opacity-15">
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
              <text x={paddingX - 10} y={y + 3.5} textAnchor="end" className="text-[10px] fill-current font-bold">{val.toFixed(1)}</text>
            </g>
          );
        })}

        {/* CGPA Area fill */}
        <path d={cgpaArea} fill="url(#cgpa-area-grad)" />

        {/* CGPA line stroke */}
        <path
          d={cgpaPath}
          fill="none"
          stroke="rgb(16, 185, 129)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow-emerald)"
        />

        {/* GPA line stroke */}
        <path
          d={gpaPath}
          fill="none"
          stroke="rgb(99, 102, 241)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow-indigo)"
          strokeDasharray="1 1"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} className="group/dot">
            {/* GPA Dot */}
            <circle
              cx={p.x}
              cy={p.yGpa}
              r="4.5"
              fill="rgb(99, 102, 241)"
              stroke="white"
              strokeWidth="1.5"
              className="cursor-pointer transition-all duration-200 hover:scale-125"
            />
            {/* CGPA Dot */}
            <circle
              cx={p.x}
              cy={p.yCgpa}
              r="5.5"
              fill="rgb(16, 185, 129)"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-200 hover:scale-125"
            />
            
            {/* Tooltip on hover */}
            <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <rect
                x={p.x - 55}
                y={Math.min(p.yGpa, p.yCgpa) - 46}
                width="110"
                height="36"
                rx="6"
                fill="rgb(15, 23, 42)"
                className="shadow-lg"
              />
              <text
                x={p.x}
                y={Math.min(p.yGpa, p.yCgpa) - 32}
                textAnchor="middle"
                fill="white"
                className="text-[9px] font-bold"
              >
                GPA: {p.gpa.toFixed(2)}
              </text>
              <text
                x={p.x}
                y={Math.min(p.yGpa, p.yCgpa) - 20}
                textAnchor="middle"
                fill="rgb(16, 185, 129)"
                className="text-[9px] font-bold"
              >
                CGPA: {p.cgpa.toFixed(2)}
              </text>
            </g>
          </g>
        ))}

        {/* X Axis Labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={200 - paddingY + 16}
            textAnchor="middle"
            className="text-[9px] font-bold fill-muted-foreground"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
