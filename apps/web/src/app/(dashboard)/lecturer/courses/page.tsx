'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Calendar,
  ChevronRight,
  GraduationCap,
  Upload,
  Users,
  X,
  Search,
} from 'lucide-react';

import { LecturerShell } from '@/components/layout/lecturer-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import type { Level, Semester } from '@eduportal/shared';

interface Course {
  id: string;
  code: string;
  title: string;
  level: Level;
  semester: Semester;
  creditUnits: number;
  departmentId: string;
}

interface MyCoursesResponse {
  session: { id: string; name: string; isCurrent: boolean };
  courses: Course[];
}

interface EnrolledStudent {
  id: string;
  fullname: string;
  email: string;
  matricNumber: string | null;
  level: Level | null;
  avatarUrl: string | null;
}

interface EnrollmentResponse {
  course: { id: string; code: string; title: string };
  session: { id: string; name: string };
  count: number;
  students: EnrolledStudent[];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function LecturerCoursesPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');

  const coursesQuery = useQuery({
    queryKey: ['courses', 'lecturer', 'mine'],
    queryFn: async () => api.get<MyCoursesResponse>('/courses/lecturer/mine'),
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => api.get<Array<{ id: string; name: string; code: string }>>('/departments'),
  });

  const enrollmentQuery = useQuery({
    queryKey: ['enrollments', 'course', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return null;
      return api.get<EnrollmentResponse>(`/enrollments/course/${selectedCourseId}`);
    },
    enabled: !!selectedCourseId,
  });

  const courses = coursesQuery.data?.courses ?? [];
  const session = coursesQuery.data?.session;
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const codeMatch = c.code.toLowerCase().includes(query);
        const titleMatch = c.title.toLowerCase().includes(query);
        if (!codeMatch && !titleMatch) return false;
      }
      if (selectedLevel !== 'ALL' && c.level !== selectedLevel) return false;
      if (selectedSemester !== 'ALL' && c.semester !== selectedSemester) return false;
      if (selectedDeptId !== 'ALL' && c.departmentId !== selectedDeptId) return false;
      return true;
    });
  }, [courses, searchQuery, selectedLevel, selectedSemester, selectedDeptId]);

  function openDrawer(id: string) {
    setSelectedCourseId(id);
    setDrawerOpen(true);
  }

  return (
    <LecturerShell>
      <PageHeader
        title="My courses"
        subtitle={
          session
            ? `Session ${session.name} · ${courses.length} assigned course${courses.length === 1 ? '' : 's'}`
            : 'Loading your courses…'
        }
      />

      {/* Search and Filters Bar */}
      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card border border-border/40 p-4 rounded-2xl shadow-xs print:hidden">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background h-10 rounded-xl"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Programme Filter */}
          <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
            <SelectTrigger className="w-[180px] bg-background h-10 rounded-xl">
              <SelectValue placeholder="All Programmes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Programmes</SelectItem>
              {departmentsQuery.data?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Level Filter */}
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-[120px] bg-background h-10 rounded-xl">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Levels</SelectItem>
              <SelectItem value="L100">100L</SelectItem>
              <SelectItem value="L200">200L</SelectItem>
              <SelectItem value="L300">300L</SelectItem>
              <SelectItem value="L400">400L</SelectItem>
              <SelectItem value="L500">500L</SelectItem>
            </SelectContent>
          </Select>

          {/* Semester Filter */}
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-[150px] bg-background h-10 rounded-xl">
              <SelectValue placeholder="All Semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Semesters</SelectItem>
              <SelectItem value="FIRST">First Semester</SelectItem>
              <SelectItem value="SECOND">Second Semester</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {(searchQuery || selectedLevel !== 'ALL' || selectedSemester !== 'ALL' || selectedDeptId !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedLevel('ALL');
                setSelectedSemester('ALL');
                setSelectedDeptId('ALL');
              }}
              className="h-10 px-3 hover:bg-muted/60 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {coursesQuery.isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses assigned"
          description="Contact your department admin to be assigned courses for this session."
          className="mt-6"
        />
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No matching courses"
          description="Try adjusting your search query or filters."
          className="mt-6"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedLevel('ALL');
                setSelectedSemester('ALL');
                setSelectedDeptId('ALL');
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {filteredCourses.map((c) => (
            <Card key={c.id} className="transition hover:border-primary/30">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-semibold text-primary">{c.code}</p>
                    <CardTitle className="mt-1 text-base">{c.title}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {c.creditUnits} cu
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {c.level}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {c.semester} semester
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => openDrawer(c.id)}
                  >
                    <Users className="h-3.5 w-3.5" />
                    View students
                  </Button>
                  <Button asChild size="sm" className="flex-1 gap-1.5">
                    <Link href={`/lecturer/results/upload?courseId=${c.id}&semester=${c.semester}`}>
                      <Upload className="h-3.5 w-3.5" />
                      Results
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="sm" className="flex-1 gap-1.5">
                    <Link href={`/lecturer/resources/upload?courseId=${c.id}`}>
                      <Upload className="h-3.5 w-3.5" />
                      Resource
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-3xl sm:max-w-lg sm:translate-x-[-50%] sm:left-1/2 sm:rounded-lg"
        >
          <SheetHeader>
            <SheetTitle>
              {selectedCourse ? `${selectedCourse.code} — Students` : 'Students'}
            </SheetTitle>
            <SheetDescription>
              {selectedCourse?.title} · {enrollmentQuery.data?.count ?? 0} enrolled
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 px-4 pb-6">
            {enrollmentQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !enrollmentQuery.data || enrollmentQuery.data.students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No enrolled students"
                description="No students are enrolled in this course for the current session."
              />
            ) : (
              <ul className="divide-y">
                {enrollmentQuery.data.students.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      {s.avatarUrl ? <AvatarImage src={s.avatarUrl} alt={s.fullname} /> : null}
                      <AvatarFallback>{initials(s.fullname)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.fullname}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.matricNumber ?? s.email}
                      </p>
                    </div>
                    {s.level ? (
                      <Badge variant="outline" className="text-[10px]">
                        {s.level}
                      </Badge>
                    ) : null}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setDrawerOpen(false)} className="gap-1.5">
                <X className="h-4 w-4" />
                Close
              </Button>
              {selectedCourse ? (
                <Button asChild>
                  <Link
                    href={`/lecturer/results/upload?courseId=${selectedCourse.id}&semester=${selectedCourse.semester}`}
                  >
                    <Upload className="h-4 w-4" />
                    Upload results
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </LecturerShell>
  );
}
