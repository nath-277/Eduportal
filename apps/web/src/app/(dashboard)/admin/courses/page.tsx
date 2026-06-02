'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookPlus,
  Filter,
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

export default function AdminCoursesPage() {
  const [levelFilter, setLevelFilter] = useState<Level | 'ALL'>('ALL');
  const [semesterFilter, setSemesterFilter] = useState<Semester | 'ALL'>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [adding, setAdding] = useState(false);
  const [assigning, setAssigning] = useState<Course | null>(null);

  const qc = useQueryClient();

  const coursesQuery = useQuery({
    queryKey: ['courses', 'admin', { levelFilter, semesterFilter, deptFilter }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (levelFilter !== 'ALL') params.level = levelFilter;
      if (semesterFilter !== 'ALL') params.semester = semesterFilter;
      if (deptFilter !== 'ALL') params.departmentId = deptFilter;
      return api.get<Course[]>('/courses', params);
    },
  });

  const deptsQuery = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => api.get<Department[]>('/departments'),
  });

  const filtered = useMemo(() => {
    return coursesQuery.data ?? [];
  }, [coursesQuery.data]);

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

      <Card className="mt-6">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as Level | 'ALL')}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All levels</SelectItem>
                {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={semesterFilter} onValueChange={(v) => setSemesterFilter(v as Semester | 'ALL')}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All semesters</SelectItem>
                <SelectItem value="FIRST">First semester</SelectItem>
                <SelectItem value="SECOND">Second semester</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v)}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All departments</SelectItem>
                {deptsQuery.data?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {coursesQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={BookPlus}
              title="No courses match"
              description="Try clearing the filters or creating a new course."
              className="m-6"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Level</th>
                    <th className="px-3 py-2 font-medium">Semester</th>
                    <th className="px-3 py-2 text-right font-medium">Credits</th>
                    <th className="px-3 py-2 font-medium">Lecturer</th>
                    <th className="px-3 py-2 font-medium">Department</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs font-semibold">{c.code}</td>
                      <td className="px-3 py-2 font-medium">{c.title}</td>
                      <td className="px-3 py-2"><Badge variant="outline">{c.level}</Badge></td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="capitalize">{c.semester.toLowerCase()}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.creditUnits}</td>
                      <td className="px-3 py-2">
                        {c.lecturers && c.lecturers.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {c.lecturers.slice(0, 2).map((l) => (
                              <span key={l.id} className="text-xs">{l.fullname}</span>
                            ))}
                            {c.lecturers.length > 2 ? (
                              <span className="text-[10px] text-muted-foreground">+{c.lecturers.length - 2} more</span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">{c.department?.code ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssigning(c)}
                          className="gap-1.5"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Assign
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
