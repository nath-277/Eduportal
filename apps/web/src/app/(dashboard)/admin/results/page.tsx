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
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/layout/admin-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { ResultStatus, Semester } from '@eduportal/shared';

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
  level: string;
  department?: { id: string; name: string; code: string };
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

export default function AdminResultsPage() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const qc = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => api.get<SessionRef[]>('/sessions'),
  });

  const currentSessionId = useMemo(() => {
    const current = sessionsQuery.data?.find((s) => s.isCurrent);
    return current?.id || sessionsQuery.data?.[0]?.id || '';
  }, [sessionsQuery.data]);

  const activeSessionId = selectedSessionId || currentSessionId;

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

  const groupKey = useMemo(
    () => (courseId: string, semester: Semester) => `${courseId}:${semester}`,
    [],
  );

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
    onSuccess: (data, vars) => {
      toast.success(`${data.updated} results approved`);
      qc.invalidateQueries({ queryKey: ['results', 'pending'] });
      setOpenGroups((s) => ({ ...s, [groupKey(vars.courseId, vars.semester)]: true }));
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

  const groups = pendingQuery.data?.groups ?? [];
  const counts = pendingQuery.data?.counts;
  const session = pendingQuery.data?.session;

  return (
    <AdminShell>
      <PageHeader
        title="Result approval"
        subtitle="Review submitted scores, approve, then push to students."
        actions={
          sessionsQuery.data && sessionsQuery.data.length > 0 ? (
            <Select
              value={activeSessionId}
              onChange={setSelectedSessionId}
              label="Session"
              options={sessionsQuery.data.map((s) => ({
                value: s.id,
                label: `${s.name}${s.isCurrent ? ' (Active)' : ''}`,
              }))}
            />
          ) : null
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
          tone="violet"
        />
      </div>

      <div className="mt-6 space-y-4">
        {pendingQuery.isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : groups.length === 0 ? (
          <Card>
            <EmptyState
              icon={CheckCheck}
              title="Nothing pending"
              description="All results for the current session are either in draft with the lecturer or already published."
              className="m-6"
            />
          </Card>
        ) : (
          groups.map((g) => {
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
  icon: typeof CalendarRange;
  label: string;
  value: number;
  sub: string;
  tone: 'amber' | 'blue' | 'violet';
}) {
  const toneClass = {
    amber: 'bg-amber-500/10 text-amber-700',
    blue: 'bg-blue-500/10 text-blue-700',
    violet: 'bg-violet-500/10 text-violet-700',
  }[tone];
  return (
    <Card className="flex items-center gap-3 p-3">
      <div className={cn('grid h-9 w-9 place-items-center rounded-lg', toneClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
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
    group.semester === 'FIRST' ? 'bg-blue-500/10 text-blue-700' : 'bg-violet-500/10 text-violet-700';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={open}
          aria-label={`Toggle ${group.course.code} ${group.semester}`}
        >
          <Chevron className="h-4 w-4 text-muted-foreground transition-transform" />
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-xs font-semibold text-primary">
            {group.course.code.replace(/[A-Z]/g, (c, i) => (i === 0 ? c : ''))}
          </div>
          <div>
            <CardTitle className="text-base">
              {group.course.code} — {group.course.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {group.course.level} · {group.course.creditUnits} units · {group.course.department?.code ?? '—'}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn('text-[10px]', semesterTone)}>
            {group.semester} semester
          </Badge>
          {group.submitted > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onApproveAll}
              disabled={pendingApproveAll}
              className="h-7 gap-1 px-2 text-xs"
              aria-label={`Approve all ${group.submitted} submitted in ${group.course.code}`}
            >
              {pendingApproveAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Approve all ({group.submitted})
            </Button>
          ) : null}
          {group.approved > 0 ? (
            <Button
              size="sm"
              onClick={onPushAll}
              disabled={pendingPushAll}
              className="h-7 gap-1 px-2 text-xs"
              aria-label={`Push all ${group.approved} approved in ${group.course.code}`}
            >
              {pendingPushAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Push all ({group.approved})
            </Button>
          ) : null}
          {group.published > 0 || group.approved > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onWithdrawAll}
              disabled={pendingWithdrawAll}
              className="h-7 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Rollback all results in ${group.course.code}`}
            >
              {pendingWithdrawAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Rollback ({group.published + group.approved})
            </Button>
          ) : null}
        </div>
      </CardHeader>
      {open ? (
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Matric</th>
                  <th className="px-3 py-1.5 font-medium">Student</th>
                  <th className="px-3 py-1.5 text-right font-medium">CA</th>
                  <th className="px-3 py-1.5 text-right font-medium">Exam</th>
                  <th className="px-3 py-1.5 text-right font-medium">Total</th>
                  <th className="px-3 py-1.5 font-medium">Grade</th>
                  <th className="px-3 py-1.5 font-medium">Status</th>
                  <th className="px-3 py-1.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
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
  return (
    <tr className="hover:bg-muted/20">
      <td className="px-3 py-1.5 font-mono text-xs">{r.student.matricNumber}</td>
      <td className="px-3 py-1.5 font-medium">{r.student.fullname}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{r.caScore}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{r.examScore}</td>
      <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{r.totalScore}</td>
      <td className="px-3 py-1.5 font-mono text-xs font-semibold">{r.grade}</td>
      <td className="px-3 py-1.5">
        {r.status === 'SUBMITTED' ? (
          <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-700">
            <Clock className="h-3 w-3" />
            Submitted
          </Badge>
        ) : r.status === 'APPROVED' ? (
          <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-700">
            <Check className="h-3 w-3" />
            Approved
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700">
            <CheckCheck className="h-3 w-3" />
            Published
          </Badge>
        )}
      </td>
      <td className="px-3 py-1.5 text-right">
        <div className="flex justify-end gap-1">
          {r.status === 'SUBMITTED' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApproveOne(r.id)}
              disabled={pendingApproveOne}
              className="h-7 gap-1 px-2 text-xs"
              aria-label={`Approve ${r.student.matricNumber}`}
            >
              {pendingApproveOne ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Approve
            </Button>
          ) : r.status === 'APPROVED' ? (
            <Button
              size="sm"
              onClick={() => onPushOne(r.id)}
              disabled={pendingPushOne}
              className="h-7 gap-1 px-2 text-xs"
              aria-label={`Push ${r.student.matricNumber}`}
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
              className="h-7 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Rollback ${r.student.matricNumber}`}
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
