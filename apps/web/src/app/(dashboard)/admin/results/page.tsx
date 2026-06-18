'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarRange,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Send,
  RotateCcw,
  Search,
  Filter,
  SlidersHorizontal,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/layout/admin-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { Level, ResultStatus, Semester } from '@eduportal/shared';

interface StudentRef {
  id: string;
  fullname: string;
  matricNumber: string;
}

interface CourseRef {
  id: string;
  code: string;
  title: string;
  creditUnits: number;
  level: Level;
  department?: { id: string; name: string; code: string };
  programme?: { id: string; name: string; code: string } | null;
}

interface SessionRef {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface PendingResult {
  id: string;
  studentId: string;
  courseId: string;
  sessionId: string;
  semester: Semester;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
  status: ResultStatus;
  createdAt: string;
  student: StudentRef;
}

interface PendingGroup {
  course: CourseRef;
  semester: Semester;
  session: SessionRef;
  submitted: number;
  approved: number;
  published: number;
  results: PendingResult[];
}

interface PendingResponse {
  session: SessionRef;
  groups: PendingGroup[];
  counts: { submitted: number; approved: number; published: number; total: number };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Programme {
  id: string;
  name: string;
  code: string;
  departmentId: string;
}

export default function AdminResultsPage() {
  const [activeLevel, setActiveLevel] = useState<Level>('L100');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [progFilter, setProgFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState<'ALL' | Semester>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AWAITING' | 'READY' | 'PUBLISHED'>('ALL');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const qc = useQueryClient();

  // Fetch academic sessions
  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => api.get<SessionRef[]>('/sessions'),
  });

  // Fetch departments
  const deptsQuery = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => api.get<Department[]>('/departments'),
  });

  // Fetch programmes based on selected department filter
  const progsQuery = useQuery({
    queryKey: ['programmes', 'by-dept-filter', deptFilter],
    queryFn: async () => {
      if (deptFilter === 'ALL') {
        return api.get<Programme[]>('/programmes');
      }
      return api.get<Programme[]>(`/departments/${deptFilter}/programmes`);
    },
  });

  const currentSessionId = useMemo(() => {
    const current = sessionsQuery.data?.find((s) => s.isCurrent);
    return current?.id || sessionsQuery.data?.[0]?.id || '';
  }, [sessionsQuery.data]);

  const activeSessionId = selectedSessionId || currentSessionId;

  // Fetch pending results groups
  const pendingQuery = useQuery({
    queryKey: ['results', 'pending', 'admin', activeSessionId],
    queryFn: async () =>
      api.get<PendingResponse>(
        '/results/pending',
        activeSessionId ? { sessionId: activeSessionId } : undefined,
      ),
    refetchInterval: 30_000,
    staleTime: 10_000,
    enabled: !sessionsQuery.isLoading,
  });

  const approveOne = useMutation({
    mutationFn: async (id: string) =>
      api.patch<{ result: PendingResult }>(`/results/${id}/approve`, {}),
    onSuccess: () => {
      toast.success('Result approved');
      qc.invalidateQueries({ queryKey: ['results', 'pending'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Approve failed'),
  });

  const pushOne = useMutation({
    mutationFn: async (id: string) =>
      api.patch<{ result: PendingResult }>(`/results/${id}/push`, {}),
    onSuccess: () => {
      toast.success('Result pushed to students');
      qc.invalidateQueries({ queryKey: ['results', 'pending'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Push failed'),
  });

  const approveAll = useMutation({
    mutationFn: async (input: { courseId: string; semester: Semester; sessionId?: string }) =>
      api.post<{ updated: number }>('/results/bulk-approve', input),
    onSuccess: (data) => {
      toast.success(`${data.updated} results approved`);
      qc.invalidateQueries({ queryKey: ['results', 'pending'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Bulk approve failed'),
  });

  const pushAll = useMutation({
    mutationFn: async (input: { courseId: string; semester: Semester; sessionId?: string }) =>
      api.post<{ updated: number; notified: number }>('/results/bulk-push', input),
    onSuccess: (data) => {
      toast.success(
        `${data.updated} results pushed · ${data.notified} student${data.notified === 1 ? '' : 's'} notified`,
      );
      qc.invalidateQueries({ queryKey: ['results', 'pending'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Bulk push failed'),
  });

  const withdrawOne = useMutation({
    mutationFn: async (id: string) =>
      api.patch<{ result: PendingResult }>(`/results/${id}/withdraw`, {}),
    onSuccess: () => {
      toast.success('Result rolled back');
      qc.invalidateQueries({ queryKey: ['results', 'pending'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Rollback failed'),
  });

  const withdrawAll = useMutation({
    mutationFn: async (input: { courseId: string; semester: Semester; sessionId?: string }) =>
      api.post<{ updated: number }>('/results/bulk-withdraw', input),
    onSuccess: (data) => {
      toast.success(`${data.updated} results rolled back`);
      qc.invalidateQueries({ queryKey: ['results', 'pending'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Bulk rollback failed'),
  });

  const groupKey = useMemo(
    () => (courseId: string, semester: Semester) => `${courseId}:${semester}`,
    [],
  );

  // Client-side filtering logic
  const filteredGroups = useMemo(() => {
    const rawGroups = pendingQuery.data?.groups ?? [];
    return rawGroups
      .map((g) => {
        // Search inside results list if a query is active
        let matchedResults = g.results;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesCourse =
            g.course.code.toLowerCase().includes(q) ||
            g.course.title.toLowerCase().includes(q);

          if (!matchesCourse) {
            // Filter results inside group that match the student query
            matchedResults = g.results.filter(
              (r) =>
                r.student.fullname.toLowerCase().includes(q) ||
                r.student.matricNumber.toLowerCase().includes(q)
            );
          }
        }

        return {
          ...g,
          results: matchedResults,
        };
      })
      .filter((g) => {
        // Exclude groups that have no matching results after search
        if (g.results.length === 0) return false;

        // Filter by Level Tab
        if (g.course.level !== activeLevel) return false;

        // Filter by Department
        if (deptFilter !== 'ALL' && g.course.department?.id !== deptFilter) return false;

        // Filter by Programme
        if (progFilter !== 'ALL' && g.course.programme?.id !== progFilter) return false;

        // Filter by Semester
        if (semesterFilter !== 'ALL' && g.semester !== semesterFilter) return false;

        // Filter by Status
        if (statusFilter === 'AWAITING' && g.submitted === 0) return false;
        if (statusFilter === 'READY' && g.approved === 0) return false;
        if (statusFilter === 'PUBLISHED' && g.published === 0) return false;

        return true;
      });
  }, [pendingQuery.data, activeLevel, searchQuery, deptFilter, progFilter, semesterFilter, statusFilter]);

  const counts = pendingQuery.data?.counts;

  return (
    <AdminShell>
      <PageHeader
        title="Result approval"
        subtitle="Review submitted scores, approve, then push to students."
        actions={
          sessionsQuery.data && sessionsQuery.data.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Session:</span>
              <Select value={activeSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="h-9 w-44 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessionsQuery.data.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.isCurrent ? ' (Active)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null
        }
      />

      {/* Summary stats cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SummaryStat
          icon={Clock}
          label="Awaiting approval"
          value={counts?.submitted ?? 0}
          sub="submitted by lecturers"
          tone="amber"
        />
        <SummaryStat
          icon={Check}
          label="Ready to push"
          value={counts?.approved ?? 0}
          sub="approved, not yet visible"
          tone="blue"
        />
        <SummaryStat
          icon={CheckCheck}
          label="Published to students"
          value={counts?.published ?? 0}
          sub="visible in student portal"
          tone="emerald"
        />
      </div>

      {/* Level Tabs */}
      <div className="mt-8 flex flex-col gap-4">
        <Tabs value={activeLevel} onValueChange={(v) => setActiveLevel(v as Level)}>
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="L100" className="rounded-lg px-4 py-2">100 Level</TabsTrigger>
            <TabsTrigger value="L200" className="rounded-lg px-4 py-2">200 Level</TabsTrigger>
            <TabsTrigger value="L300" className="rounded-lg px-4 py-2">300 Level</TabsTrigger>
            <TabsTrigger value="L400" className="rounded-lg px-4 py-2">400 Level</TabsTrigger>
            <TabsTrigger value="L500" className="rounded-lg px-4 py-2">500 Level</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters Toolbar */}
      <Card className="mt-4 p-4 border border-border/40 bg-card/60 backdrop-blur-sm shadow-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search course code, title, student name or matric..."
              className="pl-9 bg-background/50 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Department Selector */}
            <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setProgFilter('ALL'); }}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Depts</SelectItem>
                {deptsQuery.data?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Programme Selector */}
            <Select value={progFilter} onValueChange={setProgFilter} disabled={deptFilter === 'ALL' && progsQuery.isLoading}>
              <SelectTrigger className="h-9 w-40 text-xs">
                <SelectValue placeholder="All Programmes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Programmes</SelectItem>
                {progsQuery.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Semester Selector */}
            <Select value={semesterFilter} onValueChange={(v) => setSemesterFilter(v as 'ALL' | Semester)}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Semesters</SelectItem>
                <SelectItem value="FIRST">First Semester</SelectItem>
                <SelectItem value="SECOND">Second Semester</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Selector */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'ALL' | 'AWAITING' | 'READY' | 'PUBLISHED')}>
              <SelectTrigger className="h-9 w-40 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="AWAITING">Awaiting Approval</SelectItem>
                <SelectItem value="READY">Ready to Push</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Main content list */}
      <div className="mt-6 space-y-4">
        {pendingQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border border-border/40">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredGroups.length === 0 ? (
          <Card className="border border-dashed p-8">
            <EmptyState
              icon={GraduationCap}
              title="No pending results found"
              description="There are no results waiting for approval or publishing for the selected criteria."
              className="m-0 border-0 bg-transparent p-0"
            />
          </Card>
        ) : (
          filteredGroups.map((g) => {
            const key = groupKey(g.course.id, g.semester);
            const open = openGroups[key] ?? true;
            return (
              <GroupCard
                key={key}
                group={g}
                open={open}
                onToggle={() => setOpenGroups((s) => ({ ...s, [key]: !(s[key] ?? true) }))}
                onApproveOne={(id) => approveOne.mutate(id)}
                onPushOne={(id) => pushOne.mutate(id)}
                onWithdrawOne={(id) => withdrawOne.mutate(id)}
                onApproveAll={() =>
                  approveAll.mutate({ courseId: g.course.id, semester: g.semester, sessionId: activeSessionId })
                }
                onPushAll={() =>
                  pushAll.mutate({ courseId: g.course.id, semester: g.semester, sessionId: activeSessionId })
                }
                onWithdrawAll={() =>
                  withdrawAll.mutate({ courseId: g.course.id, semester: g.semester, sessionId: activeSessionId })
                }
                pendingApproveOne={approveOne.isPending}
                pendingPushOne={pushOne.isPending}
                pendingWithdrawOne={withdrawOne.isPending}
                pendingApproveAll={approveAll.isPending}
                pendingPushAll={pushAll.isPending}
                pendingWithdrawAll={withdrawAll.isPending}
              />
            );
          })
        )}
      </div>
    </AdminShell>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  sub: string;
  tone: 'amber' | 'blue' | 'emerald';
}) {
  const toneClass = {
    amber: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  }[tone];

  return (
    <Card className={cn('border border-border/40 shadow-sm transition hover:shadow-md flex items-center gap-4 p-4', toneClass)}>
      <div className={cn('grid h-12 w-12 place-items-center rounded-xl', toneClass)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
        <p className="text-2xl font-bold mt-0.5 tabular-nums text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground/80 mt-0.5">{sub}</p>
      </div>
    </Card>
  );
}

function GroupCard({
  group,
  open,
  onToggle,
  onApproveOne,
  onPushOne,
  onWithdrawOne,
  onApproveAll,
  onPushAll,
  onWithdrawAll,
  pendingApproveOne,
  pendingPushOne,
  pendingWithdrawOne,
  pendingApproveAll,
  pendingPushAll,
  pendingWithdrawAll,
}: {
  group: PendingGroup;
  open: boolean;
  onToggle: () => void;
  onApproveOne: (id: string) => void;
  onPushOne: (id: string) => void;
  onWithdrawOne: (id: string) => void;
  onApproveAll: () => void;
  onPushAll: () => void;
  onWithdrawAll: () => void;
  pendingApproveOne: boolean;
  pendingPushOne: boolean;
  pendingWithdrawOne: boolean;
  pendingApproveAll: boolean;
  pendingPushAll: boolean;
  pendingWithdrawAll: boolean;
}) {
  const Chevron = open ? ChevronDown : ChevronRight;
  const semesterTone =
    group.semester === 'FIRST' ? 'bg-blue-500/10 text-blue-700' : 'bg-purple-500/10 text-purple-700';

  const total = group.results.length;
  const submittedPct = total > 0 ? (group.submitted / total) * 100 : 0;
  const approvedPct = total > 0 ? (group.approved / total) * 100 : 0;
  const publishedPct = total > 0 ? (group.published / total) * 100 : 0;

  return (
    <Card className="border border-border/40 shadow-sm transition hover:shadow-md overflow-hidden bg-card/40 backdrop-blur-sm">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between space-y-0 gap-4 p-4 border-b">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-start sm:items-center gap-3 text-left"
          aria-expanded={open}
          aria-label={`Toggle results for ${group.course.code}`}
        >
          <Chevron className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 sm:mt-0 transition-transform" />
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 font-mono text-xs font-bold text-primary">
            {group.course.code.replace(/[A-Z]/g, (c, i) => (i === 0 ? c : ''))}
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base font-bold flex flex-wrap items-center gap-2">
              {group.course.code} — {group.course.title}
              <Badge variant="secondary" className={cn('text-[10px] uppercase font-bold py-0 px-2 tracking-wider shrink-0', semesterTone)}>
                {group.semester} SEMESTER
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {group.course.level.replace('L', '')}L · {group.course.creditUnits} Units · {group.course.department?.name ?? '—'}
              {group.course.programme ? ` (${group.course.programme.code})` : ''}
            </p>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {group.submitted > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onApproveAll}
              disabled={pendingApproveAll}
              className="h-8 gap-1.5 px-3 text-xs bg-amber-500/5 hover:bg-amber-500/10 text-amber-800 hover:text-amber-800 border-amber-500/20 font-semibold"
            >
              {pendingApproveAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve all ({group.submitted})
            </Button>
          ) : null}
          {group.approved > 0 ? (
            <Button
              size="sm"
              onClick={onPushAll}
              disabled={pendingPushAll}
              className="h-8 gap-1.5 px-3 text-xs bg-primary hover:bg-primary/95 font-semibold text-primary-foreground"
            >
              {pendingPushAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Push all ({group.approved})
            </Button>
          ) : null}
          {group.published > 0 || group.approved > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onWithdrawAll}
              disabled={pendingWithdrawAll}
              className="h-8 gap-1.5 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 font-semibold"
            >
              {pendingWithdrawAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Rollback ({group.published + group.approved})
            </Button>
          ) : null}
        </div>
      </CardHeader>

      {/* Progress Breakdown bar */}
      <div className="px-4 py-2 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-1">
          <span className="font-semibold text-muted-foreground shrink-0">Progress:</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted flex border shadow-inner">
            {submittedPct > 0 && (
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${submittedPct}%` }}
                title={`${group.submitted} Awaiting Approval`}
              />
            )}
            {approvedPct > 0 && (
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${approvedPct}%` }}
                title={`${group.approved} Ready to Push`}
              />
            )}
            {publishedPct > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${publishedPct}%` }}
                title={`${group.published} Published`}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{group.submitted} Awaiting</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />{group.approved} Ready</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{group.published} Published</span>
          <span className="font-bold text-foreground">({total} total)</span>
        </div>
      </div>

      {open ? (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Matric</th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 text-right font-semibold">CA (40)</th>
                  <th className="px-4 py-3 text-right font-semibold">Exam (60)</th>
                  <th className="px-4 py-3 text-right font-semibold">Total (100)</th>
                  <th className="px-4 py-3 font-semibold">Grade</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {group.results.map((r) => (
                  <RowActions
                    key={r.id}
                    r={r}
                    onApproveOne={onApproveOne}
                    onPushOne={onPushOne}
                    onWithdrawOne={onWithdrawOne}
                    pendingApproveOne={pendingApproveOne}
                    pendingPushOne={pendingPushOne}
                    pendingWithdrawOne={pendingWithdrawOne}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

function RowActions({
  r,
  onApproveOne,
  onPushOne,
  onWithdrawOne,
  pendingApproveOne,
  pendingPushOne,
  pendingWithdrawOne,
}: {
  r: PendingResult;
  onApproveOne: (id: string) => void;
  onPushOne: (id: string) => void;
  onWithdrawOne: (id: string) => void;
  pendingApproveOne: boolean;
  pendingPushOne: boolean;
  pendingWithdrawOne: boolean;
}) {
  const gradeTone = {
    A: 'text-emerald-600 dark:text-emerald-400 font-bold',
    B: 'text-blue-600 dark:text-blue-400 font-bold',
    C: 'text-sky-600 dark:text-sky-400 font-bold',
    D: 'text-amber-600 dark:text-amber-400 font-bold',
    E: 'text-orange-600 dark:text-orange-400 font-bold',
    F: 'text-rose-600 dark:text-rose-400 font-bold',
  }[r.grade[0]] ?? 'text-foreground';

  return (
    <tr className="hover:bg-muted/15 transition-colors">
      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-muted-foreground">{r.student.matricNumber}</td>
      <td className="px-4 py-2.5 font-medium text-foreground">{r.student.fullname}</td>
      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">{r.caScore}</td>
      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">{r.examScore}</td>
      <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums text-foreground">{r.totalScore}</td>
      <td className="px-4 py-2.5 font-mono text-xs"><span className={gradeTone}>{r.grade}</span></td>
      <td className="px-4 py-2.5">
        {r.status === 'SUBMITTED' ? (
          <Badge variant="secondary" className="gap-1.5 bg-amber-500/10 text-amber-800 border-amber-500/20 font-semibold text-[10px] py-0 px-2">
            <Clock className="h-3 w-3" />
            Awaiting Approval
          </Badge>
        ) : r.status === 'APPROVED' ? (
          <Badge variant="secondary" className="gap-1.5 bg-blue-500/10 text-blue-800 border-blue-500/20 font-semibold text-[10px] py-0 px-2">
            <Check className="h-3 w-3" />
            Approved
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-800 border-emerald-500/20 font-semibold text-[10px] py-0 px-2">
            <CheckCheck className="h-3 w-3" />
            Published
          </Badge>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex justify-end gap-1.5">
          {r.status === 'SUBMITTED' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApproveOne(r.id)}
              disabled={pendingApproveOne}
              className="h-7 gap-1 px-2.5 text-[11px] bg-amber-500/5 hover:bg-amber-500/10 text-amber-800 border-amber-500/20 font-semibold"
            >
              {pendingApproveOne ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Approve
            </Button>
          ) : r.status === 'APPROVED' ? (
            <Button
              size="sm"
              onClick={() => onPushOne(r.id)}
              disabled={pendingPushOne}
              className="h-7 gap-1 px-2.5 text-[11px] bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
            >
              {pendingPushOne ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Push
            </Button>
          ) : r.status === 'PUBLISHED' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onWithdrawOne(r.id)}
              disabled={pendingWithdrawOne}
              className="h-7 gap-1 px-2.5 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 font-semibold"
            >
              {pendingWithdrawOne ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Rollback
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}
