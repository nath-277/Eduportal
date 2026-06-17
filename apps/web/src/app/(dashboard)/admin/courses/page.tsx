'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookPlus,
  Filter,
  Layers,
  Loader2,
  Plus,
  UserPlus,
  Search,
  Trash2,
  MoreVertical,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  programmeId?: string | null;
  programme?: { id: string; name: string; code: string } | null;
  lecturers?: Array<{ id: string; fullname: string; email: string }>;
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
  programmeId: string;
}

interface AssignForm {
  lecturerId: string;
  session: string;
}

const LEVELS: Level[] = ['L100', 'L200', 'L300', 'L400', 'L500'];
const SEMESTERS: Semester[] = ['FIRST', 'SECOND'];

export default function AdminCoursesPage() {
  const [activeLevel, setActiveLevel] = useState<Level>('L100');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [progFilter, setProgFilter] = useState('ALL');
  const [creditFilter, setCreditFilter] = useState('ALL');
  const [adding, setAdding] = useState(false);
  const [assigning, setAssigning] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);

  const qc = useQueryClient();

  const coursesQuery = useQuery({
    queryKey: ['courses', 'admin-all'],
    queryFn: async () => api.get<Course[]>('/courses'),
  });

  const deptsQuery = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => api.get<Department[]>('/departments'),
  });

  const programmesQuery = useQuery({
    queryKey: ['programmes', 'by-dept-filter', deptFilter],
    queryFn: async () => {
      if (deptFilter === 'ALL') return [];
      return api.get<Programme[]>(`/departments/${deptFilter}/programmes`);
    },
    enabled: deptFilter !== 'ALL',
  });



  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/courses/${id}`),
    onSuccess: () => {
      toast.success('Course deleted');
      qc.invalidateQueries({ queryKey: ['courses'] });
      setDeleting(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    },
  });

  const filteredCourses = useMemo(() => {
    let list = coursesQuery.data ?? [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q)
      );
    }

    if (deptFilter !== 'ALL') {
      list = list.filter((c) => c.departmentId === deptFilter);
    }

    if (progFilter !== 'ALL') {
      list = list.filter((c) => c.programmeId === progFilter);
    }

    if (creditFilter !== 'ALL') {
      list = list.filter((c) => c.creditUnits === Number(creditFilter));
    }

    return list;
  }, [coursesQuery.data, searchQuery, deptFilter, progFilter, creditFilter]);

  const grouped = useMemo(() => {
    type Bucket = Record<Level, { FIRST: Course[]; SECOND: Course[] }>;
    const empty = () => ({ FIRST: [], SECOND: [] });
    const out: Bucket = {
      L100: empty(),
      L200: empty(),
      L300: empty(),
      L400: empty(),
      L500: empty(),
      GRADUATED: empty(),
    };
    for (const c of filteredCourses) {
      if (out[c.level]) {
        out[c.level][c.semester].push(c);
      }
    }
    for (const lvl of LEVELS) {
      out[lvl].FIRST.sort((a, b) => a.code.localeCompare(b.code));
      out[lvl].SECOND.sort((a, b) => a.code.localeCompare(b.code));
    }
    return out;
  }, [filteredCourses]);

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
        <SummaryStat
          icon={Filter}
          label="Departments"
          value={deptsQuery.data?.length ?? 0}
          sub="offering courses"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="mt-6 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by course code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={deptFilter} onValueChange={(v) => {
              setDeptFilter(v);
              setProgFilter('ALL');
            }}>
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {deptsQuery.data?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={progFilter}
              onValueChange={setProgFilter}
              disabled={deptFilter === 'ALL'}
            >
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder="Programme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Programmes</SelectItem>
                {programmesQuery.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={creditFilter} onValueChange={setCreditFilter}>
              <SelectTrigger className="h-9 w-[110px] text-xs">
                <SelectValue placeholder="Credits" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Credits</SelectItem>
                {['1', '2', '3', '4', '5', '6'].map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit} Unit{unit === '1' ? '' : 's'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchQuery || deptFilter !== 'ALL' || progFilter !== 'ALL' || creditFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setDeptFilter('ALL');
                  setProgFilter('ALL');
                  setCreditFilter('ALL');
                }}
                className="h-9 text-xs text-destructive hover:bg-destructive/5 hover:text-destructive"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs value={activeLevel} onValueChange={(v) => setActiveLevel(v as Level)} className="mt-6">
        <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1">
          {LEVELS.map((lvl) => {
            const first = grouped[lvl].FIRST;
            const second = grouped[lvl].SECOND;
            const total = first.length + second.length;
            return (
              <TabsTrigger key={lvl} value={lvl} className="py-2 text-xs font-semibold sm:text-sm">
                {lvl}
                {total > 0 && (
                  <Badge variant="secondary" className="ml-1.5 hidden h-4 px-1 text-[9px] sm:inline-flex">
                    {total}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {LEVELS.map((lvl) => (
          <TabsContent key={lvl} value={lvl} className="mt-6 space-y-6">
            {coursesQuery.isLoading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
            ) : grouped[lvl].FIRST.length === 0 && grouped[lvl].SECOND.length === 0 ? (
              <Card>
                <EmptyState
                  icon={BookPlus}
                  title={`No ${lvl} courses found`}
                  description="Try adjusting your filters or add a new course."
                  className="m-6"
                />
              </Card>
            ) : (
              <>
                <SemesterTable
                  label="First semester"
                  tone="bg-blue-500/10 text-blue-700"
                  courses={grouped[lvl].FIRST}
                  onAssign={(c) => setAssigning(c)}
                  onDelete={(c) => setDeleting(c)}
                />
                <SemesterTable
                  label="Second semester"
                  tone="bg-violet-500/10 text-violet-700"
                  courses={grouped[lvl].SECOND}
                  onAssign={(c) => setAssigning(c)}
                  onDelete={(c) => setDeleting(c)}
                />
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

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

      {deleting ? (
        <Dialog open onOpenChange={(o) => { if (!o) setDeleting(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete course</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <span className="font-mono font-semibold text-foreground">{deleting.code}</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 text-sm">
              <p className="font-medium">{deleting.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Credits: {deleting.creditUnits} units · Level: {deleting.level} · Semester: {deleting.semester}
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleting.id)}
                className="gap-1.5"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

function SemesterTable({
  label,
  tone,
  courses,
  onAssign,
  onDelete,
}: {
  label: string;
  tone: string;
  courses: Course[];
  onAssign: (c: Course) => void;
  onDelete: (c: Course) => void;
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
              <th className="px-3 py-1.5 font-medium">Dept/Prog</th>
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
                <td className="px-3 py-1.5 text-xs">
                  {c.department?.code ?? '—'}
                  {c.programme?.code ? ` / ${c.programme.code}` : ''}
                </td>
                <td className="px-3 py-2 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onAssign(c)} className="gap-1.5 text-xs cursor-pointer">
                        <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                        Assign Lecturer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(c)}
                        className="gap-1.5 text-xs text-destructive focus:bg-destructive/5 focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Course
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
      programmeId: 'NONE',
    },
  });

  const departmentId = watch('departmentId');
  const programmeId = watch('programmeId');

  const programmesQuery = useQuery({
    queryKey: ['programmes', 'by-department', departmentId],
    queryFn: async () => {
      if (!departmentId || departmentId === 'NONE') return [];
      return api.get<Programme[]>(`/departments/${departmentId}/programmes`);
    },
    enabled: !!departmentId && departmentId !== 'NONE',
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
        programmeId: input.programmeId && input.programmeId !== 'NONE' ? input.programmeId : null,
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
            <Select value={watch('departmentId')} onValueChange={(v) => {
              setValue('departmentId', v);
              setValue('programmeId', 'NONE');
            }}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {departmentId && departmentId !== 'NONE' && (
            <div className="space-y-1.5">
              <Label>Programme (Optional)</Label>
              <Select
                value={programmeId}
                onValueChange={(v) => setValue('programmeId', v)}
                disabled={programmesQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      programmesQuery.isLoading ? 'Loading programmes…' : 'All programmes (General)'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">All programmes (General)</SelectItem>
                  {(programmesQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
