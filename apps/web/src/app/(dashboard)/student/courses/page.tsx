'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Plus,
  Printer,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { StudentShell } from '@/components/layout/student-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import type { Level, Semester } from '@eduportal/shared';

interface Course {
  id: string;
  code: string;
  title: string;
  creditUnits: number;
  level: Level;
  semester: Semester;
  description: string | null;
  department?: { id: string; name: string; code: string } | null;
  lecturers?: Array<{ id: string; fullname: string; email: string }>;
}

interface Enrollment {
  id: string;
  courseId: string;
  semester: Semester;
  course: Course;
}

interface MyEnrollmentsResponse {
  session: { id: string; name: string; isCurrent: boolean };
  firstSemester: Enrollment[];
  secondSemester: Enrollment[];
}

const MAX_UNITS = 24;

export default function StudentCoursesPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const studentLevel = user?.level ?? 'L100';
  const [semester, setSemester] = useState<Semester>('FIRST');
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const enrollmentsQuery = useQuery({
    queryKey: ['enrollments', 'mine'],
    queryFn: async () => api.get<MyEnrollmentsResponse>('/enrollments/mine'),
  });

  const coursesQuery = useQuery({
    queryKey: ['courses', 'available', studentLevel, semester],
    queryFn: async () => {
      const data = await api.get<Course[]>(`/courses?level=${studentLevel}&semester=${semester}`);
      return data;
    },
  });

  const currentEnrollments = useMemo(() => {
    if (!enrollmentsQuery.data) return [];
    return semester === 'FIRST'
      ? enrollmentsQuery.data.firstSemester
      : enrollmentsQuery.data.secondSemester;
  }, [enrollmentsQuery.data, semester]);

  const currentUnits = useMemo(
    () => currentEnrollments.reduce((acc, e) => acc + (e.course.creditUnits ?? 0), 0),
    [currentEnrollments],
  );

  const pendingUnits = useMemo(
    () => coursesQuery.data
      ?.filter((c) => pending.has(c.id))
      .reduce((acc, c) => acc + c.creditUnits, 0) ?? 0,
    [coursesQuery.data, pending],
  );

  const totalIfCommitted = currentUnits + pendingUnits;
  const overLimit = totalIfCommitted > MAX_UNITS;

  const enrolledIds = useMemo(
    () => new Set(currentEnrollments.map((e) => e.courseId)),
    [currentEnrollments],
  );

  const enrollMutation = useMutation({
    mutationFn: async (courseIds: string[]) => {
      return api.post<{ count: number; totalCreditUnits: number; enrollments: Enrollment[] }>(
        '/enrollments',
        {
          courseIds,
          semester,
          sessionId: enrollmentsQuery.data?.session.id,
        },
      );
    },
    onSuccess: (data) => {
      toast.success(`Registered for ${data.count} course${data.count > 1 ? 's' : ''}`);
      setPending(new Set());
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Could not register';
      toast.error(message);
    },
  });

  const dropMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return api.delete(`/enrollments/${courseId}`);
    },
    onSuccess: () => {
      toast.success('Course dropped');
      qc.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Could not drop';
      toast.error(message);
    },
  });

  const togglePending = (course: Course) => {
    if (enrolledIds.has(course.id)) return;
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(course.id)) {
        next.delete(course.id);
      } else {
        if (currentUnits + pendingUnits + course.creditUnits > MAX_UNITS) {
          toast.error(`Adding ${course.code} would exceed ${MAX_UNITS} units.`);
          return prev;
        }
        next.add(course.id);
      }
      return next;
    });
  };

  const availableCourses = (coursesQuery.data ?? []).filter(
    (c) => !enrolledIds.has(c.id),
  );

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <StudentShell>
      <div className="print:hidden">
        <PageHeader
          title="Course registration"
          subtitle="Pick the courses you want to take this semester."
        />
      </div>

      <Card className="mt-6 print:hidden">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Academic session ·{' '}
              {enrollmentsQuery.data?.session.name ?? 'Loading…'}
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              {semester === 'FIRST' ? 'First' : 'Second'} Semester
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border bg-card p-0.5">
              {(['FIRST', 'SECOND'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSemester(s);
                    setPending(new Set());
                  }}
                  className={cn(
                    'rounded px-3 py-1.5 text-xs font-medium transition',
                    semester === s
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {s === 'FIRST' ? 'First' : 'Second'}
                </button>
              ))}
            </div>
            <UnitTracker current={currentUnits} pending={pendingUnits} />
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print form
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3 print:hidden">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enrolled ({currentEnrollments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollmentsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : currentEnrollments.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                  You have not enrolled in any {semester === 'FIRST' ? 'first' : 'second'}-semester courses yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {currentEnrollments.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {e.course.code}
                          </span>
                          <Badge variant="secondary">{e.course.creditUnits} units</Badge>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-sm font-medium">{e.course.title}</p>
                        {e.course.lecturers && e.course.lecturers.length > 0 && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <UserIcon className="h-3 w-3" />
                            {e.course.lecturers.map((l) => l.fullname).join(', ')}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => dropMutation.mutate(e.courseId)}
                        disabled={dropMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Drop
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available for {studentLevel.replace('L', 'Level ')}</CardTitle>
            </CardHeader>
            <CardContent>
              {coursesQuery.isLoading ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : availableCourses.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                  No additional courses available for this semester.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableCourses.map((c) => {
                    const selected = pending.has(c.id);
                    const wouldExceed = currentUnits + pendingUnits + c.creditUnits > MAX_UNITS;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => togglePending(c)}
                        disabled={wouldExceed && !selected}
                        className={cn(
                          'group flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left transition',
                          selected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                            : wouldExceed
                              ? 'cursor-not-allowed border-dashed opacity-60'
                              : 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm',
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {c.code}
                          </span>
                          <Badge variant="secondary">{c.creditUnits} units</Badge>
                        </div>
                        <p className="text-sm font-medium leading-tight">{c.title}</p>
                        {c.lecturers && c.lecturers.length > 0 ? (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserIcon className="h-3 w-3" />
                            {c.lecturers.map((l) => l.fullname).join(', ')}
                          </p>
                        ) : (
                          <p className="text-xs italic text-muted-foreground">No lecturer assigned</p>
                        )}
                        <div className="mt-1 flex w-full items-center justify-between text-xs">
                          {selected ? (
                            <span className="inline-flex items-center gap-1 font-medium text-primary">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Added to cart
                            </span>
                          ) : wouldExceed ? (
                            <span className="inline-flex items-center gap-1 text-destructive">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Would exceed {MAX_UNITS} units
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Tap to add</span>
                          )}
                          {selected ? null : (
                            <Plus className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registration summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Enrolled</span>
                <span className="font-medium tabular-nums">{currentUnits} units</span>
              </div>
              {pendingUnits > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">To add</span>
                  <span className="font-medium tabular-nums text-primary">+{pendingUnits} units</span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      overLimit && 'text-destructive',
                    )}
                  >
                    {totalIfCommitted} / {MAX_UNITS}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (totalIfCommitted / MAX_UNITS) * 100)}
                  className="mt-2 h-1.5"
                />
              </div>

              {pending.size > 0 ? (
                <div className="space-y-1.5 border-t pt-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Selected
                  </p>
                  {Array.from(pending).map((id) => {
                    const c = availableCourses.find((x) => x.id === id);
                    if (!c) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-medium">{c.code}</span>
                        <span className="text-muted-foreground">{c.creditUnits}u</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-md bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                  Pick courses from the catalog to start.
                </p>
              )}

              <Button
                className="w-full"
                disabled={pending.size === 0 || enrollMutation.isPending || overLimit}
                onClick={() => setConfirmOpen(true)}
              >
                {enrollMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
                Confirm registration
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {confirmOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setConfirmOpen(false)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div
              className="relative w-full max-w-md rounded-t-2xl border bg-card p-6 shadow-2xl sm:rounded-2xl"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
            >
              <h2 className="text-lg font-semibold">Confirm registration</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You are about to register for {pending.size} course
                {pending.size > 1 ? 's' : ''} ({pendingUnits} units).
              </p>
              <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto text-sm">
                {Array.from(pending).map((id) => {
                  const c = availableCourses.find((x) => x.id === id);
                  if (!c) return null;
                  return (
                    <li key={id} className="flex items-center justify-between">
                      <span className="font-medium">{c.code}</span>
                      <span className="text-muted-foreground">{c.title}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6 flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => enrollMutation.mutate(Array.from(pending))}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <PrintableRegistration
        userName={user?.fullname ?? ''}
        matric={user?.matricNumber ?? ''}
        level={user?.level ?? ''}
        department={user?.departmentId ?? ''}
        session={enrollmentsQuery.data?.session.name ?? ''}
        semester={semester}
        enrollments={currentEnrollments}
      />
    </StudentShell>
  );
}

function UnitTracker({ current, pending }: { current: number; pending: number }) {
  const total = current + pending;
  const over = total > MAX_UNITS;
  return (
    <Badge variant={over ? 'destructive' : 'secondary'} className="gap-1 px-2.5 py-1 text-xs">
      <GraduationCap className="h-3 w-3" />
      {current}
      {pending > 0 && (
        <span className="text-primary-foreground/80">+{pending}</span>
      )}{' '}
      / {MAX_UNITS} units
    </Badge>
  );
}

function PrintableRegistration({
  userName,
  matric,
  level,
  department,
  session,
  semester,
  enrollments,
}: {
  userName: string;
  matric: string;
  level: string;
  department: string;
  session: string;
  semester: Semester;
  enrollments: Enrollment[];
}) {
  const total = enrollments.reduce((acc, e) => acc + e.course.creditUnits, 0);
  return (
    <div className="hidden print:block print:bg-white print:p-8 print:text-black">
      <div className="border-2 border-black p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">EduPortal — Course Registration Form</h1>
          <p className="mt-1 text-sm">{session} Academic Session · {semester} Semester</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Student name</p>
            <p>{userName}</p>
          </div>
          <div>
            <p className="font-semibold">Matric number</p>
            <p>{matric}</p>
          </div>
          <div>
            <p className="font-semibold">Level</p>
            <p>{level}</p>
          </div>
          <div>
            <p className="font-semibold">Department</p>
            <p>{department}</p>
          </div>
        </div>
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-2 text-left">#</th>
              <th className="py-2 text-left">Course code</th>
              <th className="py-2 text-left">Course title</th>
              <th className="py-2 text-right">Units</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e, i) => (
              <tr key={e.id} className="border-b border-black/30">
                <td className="py-2">{i + 1}</td>
                <td className="py-2 font-medium">{e.course.code}</td>
                <td className="py-2">{e.course.title}</td>
                <td className="py-2 text-right">{e.course.creditUnits}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="py-2 text-right font-semibold">
                Total credit units
              </td>
              <td className="py-2 text-right font-semibold">{total}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="border-t border-black pt-1">Student signature</div>
          </div>
          <div>
            <div className="border-t border-black pt-1">Course advisor</div>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-black/60">
          Generated by EduPortal · {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}
