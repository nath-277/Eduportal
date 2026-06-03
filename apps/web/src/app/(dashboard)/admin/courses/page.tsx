'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookPlus,
  Filter,
  Layers,
  Loader2,
  Plus,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/layout/admin-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Level, Semester } from '@eduportal/shared';

interface Course {
  id: string;
  code: string;
  title: string;
  creditUnits: number;
  level: Level;
  semester: Semester;
  description?: string | null;
  departmentId: string;
  department?: { id: string; name: string; code: string };
  lecturers?: Array<{ id: string; fullname: string; email: string }>;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface User {
  id: string;
  fullname: string;
  email: string;
  role: 'STUDENT' | 'LECTURER' | 'ADMIN';
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CourseForm {
  code: string;
  title: string;
  creditUnits: number;
  level: Level;
  semester: Semester;
  departmentId: string;
}

interface AssignForm {
  lecturerId: string;
  session: string;
}

const LEVELS: Level[] = ['L100', 'L200', 'L300', 'L400', 'L500'];
const SEMESTERS: Semester[] = ['FIRST', 'SECOND'];

export default function AdminCoursesPage() {
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [adding, setAdding] = useState(false);
  const [assigning, setAssigning] = useState<Course | null>(null);

  const qc = useQueryClient();

  const coursesQuery = useQuery({
    queryKey: ['courses', 'admin', { deptFilter }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (deptFilter !== 'ALL') params.departmentId = deptFilter;
      return api.get<Course[]>('/courses', params);
    },
  });

  const deptsQuery = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => api.get<Department[]>('/departments'),
  });

  const grouped = useMemo(() => {
    type Bucket = Record<Level, Record<Semester, Course[]>>;
    const empty = (): Record<Semester, Course[]> => ({ FIRST: [], SECOND: [] });
    const out: Bucket = {
      L100: empty(),
      L200: empty(),
      L300: empty(),
      L400: empty(),
      L500: empty(),
    };
    for (const c of coursesQuery.data ?? []) {
      if (out[c.level] && out[c.level][c.semester]) {
        out[c.level][c.semester].push(c);
      }
    }
    for (const lvl of LEVELS) {
      for (const sem of SEMESTERS) {
        out[lvl][sem].sort((a, b) => a.code.localeCompare(b.code));
      }
    }
    return out;
  }, [coursesQuery.data]);

  const totalCount = coursesQuery.data?.length ?? 0;

  return (
    <AdminShell>
      <PageHeader
        title="Course management"
        subtitle="Create courses and assign lecturers to the active session."
        actions={
          <Button onClick={() => setAdding(true)} className="gap-1.5">
            <BookPlus className="h-4 w-4" />
            New course
          </Button>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <SummaryStat
          icon={Layers}
          label="Total courses"
          value={totalCount}
          sub="across all levels"
        />
        <SummaryStat
          icon={BookPlus}
          label="Levels covered"
          value={LEVELS.filter((l) => grouped[l].FIRST.length + grouped[l].SECOND.length > 0).length}
          sub={`of ${LEVELS.length} possible`}
        />
        <Card className="flex items-center gap-3 p-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Filter className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Department</p>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-7 w-full border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All departments</SelectItem>
                {deptsQuery.data?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {coursesQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : totalCount === 0 ? (
          <Card>
            <EmptyState
              icon={BookPlus}
              title="No courses match"
              description="Try clearing the department filter or creating a new course."
              className="m-6"
            />
          </Card>
        ) : (
          LEVELS.map((level) => {
            const first = grouped[level].FIRST;
            const second = grouped[level].SECOND;
            const levelCount = first.length + second.length;
            if (levelCount === 0) return null;
            return (
              <LevelGroup
                key={level}
                level={level}
                first={first}
                second={second}
                onAssign={(c) => setAssigning(c)}
              />
            );
          })
        )}
      </div>

      {adding ? (
        <AddCourseDialog
          departments={deptsQuery.data ?? []}
          onClose={() => setAdding(false)}
        />
      ) : null}

      {assigning ? (
        <AssignLecturerDialog
          course={assigning}
          onClose={() => setAssigning(null)}
        />
      ) : null}
    </AdminShell>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Layers;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        {sub ? <p className="text-[10px] text-muted-foreground">{sub}</p> : null}
      </div>
    </Card>
  );
}

function LevelGroup({
  level,
  first,
  second,
  onAssign,
}: {
  level: Level;
  first: Course[];
  second: Course[];
  onAssign: (c: Course) => void;
}) {
  const [open, setOpen] = useState(true);
  const totalUnits = [...first, ...second].reduce((acc, c) => acc + c.creditUnits, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 font-mono text-xs font-semibold text-primary">
            {level}
          </div>
          <div>
            <CardTitle className="text-base">{level} courses</CardTitle>
            <p className="text-xs text-muted-foreground">
              {first.length + second.length} course{first.length + second.length === 1 ? '' : 's'} ·{' '}
              {totalUnits} unit{totalUnits === 1 ? '' : 's'} total
            </p>
          </div>
        </button>
        <Badge variant="secondary" className="text-[10px]">
          {first.length} first · {second.length} second
        </Badge>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-3 pt-0">
          <SemesterTable
            label="First semester"
            tone="bg-blue-500/10 text-blue-700"
            courses={first}
            onAssign={onAssign}
          />
          <SemesterTable
            label="Second semester"
            tone="bg-violet-500/10 text-violet-700"
            courses={second}
            onAssign={onAssign}
          />
        </CardContent>
      ) : null}
    </Card>
  );
}

function SemesterTable({
  label,
  tone,
  courses,
  onAssign,
}: {
  label: string;
  tone: string;
  courses: Course[];
  onAssign: (c: Course) => void;
}) {
  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        No {label.toLowerCase()} courses
      </div>
    );
  }
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        <Badge variant="secondary" className={cn('text-[10px]', tone)}>
          {courses.length} course{courses.length === 1 ? '' : 's'}
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/10 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 font-medium">Code</th>
              <th className="px-3 py-1.5 font-medium">Title</th>
              <th className="px-3 py-1.5 text-right font-medium">Credits</th>
              <th className="px-3 py-1.5 font-medium">Lecturer</th>
              <th className="px-3 py-1.5 font-medium">Dept</th>
              <th className="px-3 py-1.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {courses.map((c) => (
              <tr key={c.id} className="hover:bg-muted/20">
                <td className="px-3 py-1.5 font-mono text-xs font-semibold">{c.code}</td>
                <td className="px-3 py-1.5 font-medium">{c.title}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{c.creditUnits}</td>
                <td className="px-3 py-1.5">
                  {c.lecturers && c.lecturers.length > 0 ? (
                    <span className="text-xs">
                      {c.lecturers.slice(0, 2).map((l) => l.fullname).join(', ')}
                      {c.lecturers.length > 2 ? ` +${c.lecturers.length - 2}` : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-xs">{c.department?.code ?? '—'}</td>
                <td className="px-3 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAssign(c)}
                    className="h-7 gap-1 px-2 text-xs"
                  >
                    <UserPlus className="h-3 w-3" />
                    Assign
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddCourseDialog({ departments, onClose }: { departments: Department[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CourseForm>({
    defaultValues: {
      code: '',
      title: '',
      creditUnits: 3,
      level: 'L100',
      semester: 'FIRST',
      departmentId: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CourseForm) =>
      api.post<Course>('/courses', {
        code: input.code.toUpperCase(),
        title: input.title,
        creditUnits: Number(input.creditUnits),
        level: input.level,
        semester: input.semester,
        departmentId: input.departmentId,
      }),
    onSuccess: () => {
      toast.success('Course created');
      qc.invalidateQueries({ queryKey: ['courses'] });
      onClose();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Create failed'),
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New course</DialogTitle>
          <DialogDescription>Add a course to the catalog.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" placeholder="CSC101" {...register('code', { required: 'Required', pattern: { value: /^[A-Za-z]{2,4}\d{3}$/, message: 'CSC101 format' } })} />
              {errors.code ? <p className="text-xs text-destructive">{errors.code.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="credit">Credits</Label>
              <Input id="credit" type="number" min={1} max={6} {...register('creditUnits', { required: 'Required', min: { value: 1, message: 'Min 1' }, max: { value: 6, message: 'Max 6' } })} />
              {errors.creditUnits ? <p className="text-xs text-destructive">{errors.creditUnits.message}</p> : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Introduction to Computer Science" {...register('title', { required: 'Required', minLength: { value: 3, message: 'At least 3 chars' } })} />
            {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={watch('level')} onValueChange={(v) => setValue('level', v as Level)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <Select value={watch('semester')} onValueChange={(v) => setValue('semester', v as Semester)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIRST">First</SelectItem>
                  <SelectItem value="SECOND">Second</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={watch('departmentId')} onValueChange={(v) => setValue('departmentId', v)}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="gap-1.5">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignLecturerDialog({ course, onClose }: { course: Course; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AssignForm>({
    defaultValues: { lecturerId: '', session: '' },
  });

  const lecturersQuery = useQuery({
    queryKey: ['users', 'lecturers'],
    queryFn: async () => {
      const data = await api.get<PaginatedResponse<User>>('/users', { role: 'LECTURER', limit: '100' });
      return data.data;
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: async () => api.get<Array<{ id: string; name: string; isCurrent: boolean }>>('/sessions'),
  });

  const assignMutation = useMutation({
    mutationFn: async (input: AssignForm) =>
      api.post(`/courses/${course.id}/assign`, input),
    onSuccess: () => {
      toast.success('Lecturer assigned');
      qc.invalidateQueries({ queryKey: ['courses'] });
      onClose();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Assign failed'),
  });

  const current = sessionsQuery.data?.find((s) => s.isCurrent);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign lecturer</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{course.code}</span> — {course.title}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => assignMutation.mutate(v))} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Lecturer</Label>
            <Select value={watch('lecturerId')} onValueChange={(v) => setValue('lecturerId', v)}>
              <SelectTrigger><SelectValue placeholder="Select lecturer" /></SelectTrigger>
              <SelectContent>
                {lecturersQuery.data?.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.fullname} · {l.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="session">Session</Label>
            <Input
              id="session"
              placeholder="2025/2026"
              defaultValue={current?.name ?? ''}
              {...register('session', { required: 'Required' })}
            />
            {errors.session ? <p className="text-xs text-destructive">{errors.session.message}</p> : null}
            <p className="text-xs text-muted-foreground">
              {current ? `Current session: ${current.name}` : 'No current session set'}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={assignMutation.isPending} className="gap-1.5">
              {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
