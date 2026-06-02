import { BookOpen, GraduationCap } from 'lucide-react';

import type { Course, Enrollment, Semester, User } from '@eduportal/shared';

export interface RegFormProps {
  student: User;
  enrollments: Enrollment[];
  courses: Course[];
  session: string;
  semester: Semester;
  departmentName?: string;
}

export function RegForm({
  student,
  enrollments,
  courses,
  session,
  semester,
  departmentName,
}: RegFormProps) {
  const expanded = enrollments
    .map((e) => courses.find((c) => c.id === e.courseId))
    .filter((c): c is Course => Boolean(c));

  const totalUnits = expanded.reduce((acc, c) => acc + c.creditUnits, 0);

  if (expanded.length === 0) {
    return (
      <div className="print-only print-page hidden">
        <div className="mx-auto max-w-3xl border-2 border-black p-10 font-mono text-black">
          <h1 className="text-center text-2xl font-bold">COURSE REGISTRATION FORM</h1>
          <p className="mt-12 text-center text-sm">
            No courses registered for {semester} semester, {session}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-only print-page hidden">
      <div className="mx-auto max-w-3xl space-y-6 border-2 border-black bg-white p-10 font-mono text-black">
        <div className="flex items-center gap-4 border-b-2 border-black pb-3">
          <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-black">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div className="flex-1 text-center">
            <p className="text-[10px] uppercase tracking-widest">University of EduPortal</p>
            <h2 className="text-base font-bold uppercase tracking-wide">
              Faculty of Computing &amp; Information Sciences
            </h2>
            <p className="text-[10px] uppercase tracking-widest">
              Course Registration &amp; Advisement Office
            </p>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-black/40 text-[8px] uppercase">
            Logo
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Course Registration Form</h1>
          <p className="mt-1 text-xs uppercase tracking-wider">
            {session} Academic Session · {semester === 'FIRST' ? 'First' : 'Second'} Semester
          </p>
        </div>

        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-black/40">
              <td className="w-1/4 py-1.5 font-semibold">Student name:</td>
              <td className="py-1.5">{student.fullname}</td>
              <td className="w-1/4 py-1.5 font-semibold">Matric No:</td>
              <td className="py-1.5">{student.matricNumber ?? '—'}</td>
            </tr>
            <tr className="border-b border-black/40">
              <td className="py-1.5 font-semibold">Level:</td>
              <td className="py-1.5">{student.level?.replace('L', 'Level ') ?? '—'}</td>
              <td className="py-1.5 font-semibold">Department:</td>
              <td className="py-1.5">{departmentName ?? '—'}</td>
            </tr>
            <tr className="border-b border-black/40">
              <td className="py-1.5 font-semibold">Session:</td>
              <td className="py-1.5">{session}</td>
              <td className="py-1.5 font-semibold">Semester:</td>
              <td className="py-1.5">{semester === 'FIRST' ? 'First' : 'Second'}</td>
            </tr>
            <tr>
              <td className="py-1.5 font-semibold">Email:</td>
              <td colSpan={3} className="py-1.5">
                {student.email}
              </td>
            </tr>
          </tbody>
        </table>

        <div>
          <h2 className="mb-2 flex items-center gap-2 border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-wider">
            <BookOpen className="h-4 w-4" />
            Registered Courses
          </h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="w-10 py-1.5 text-center">S/N</th>
                <th className="py-1.5">Course Code</th>
                <th className="py-1.5">Course Title</th>
                <th className="py-1.5 text-right">Credit Units</th>
                <th className="py-1.5">Assigned Lecturer</th>
              </tr>
            </thead>
            <tbody>
              {expanded.map((c, i) => (
                <tr key={c.id} className="border-b border-black/30">
                  <td className="py-2 text-center">{i + 1}</td>
                  <td className="py-2 font-semibold">{c.code}</td>
                  <td className="py-2">{c.title}</td>
                  <td className="py-2 text-right tabular-nums">{c.creditUnits}</td>
                  <td className="py-2 italic text-black/60">TBA</td>
                </tr>
              ))}
              <tr className="border-t-2 border-black">
                <td colSpan={3} className="py-2 text-right font-bold uppercase">
                  Total credit units:
                </td>
                <td className="py-2 text-right font-bold tabular-nums">{totalUnits}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded border-2 border-black p-3 text-xs italic">
          I confirm that the courses listed above are those I wish to register for this
          semester. I understand that any course dropped after the registration deadline will
          be recorded as &quot;W&quot; (withdrawn) on my transcript.
        </div>

        <div className="mt-10 grid grid-cols-2 gap-12 text-sm">
          <div>
            <div className="h-12 border-b border-black" />
            <div className="pt-1">Student signature &amp; date</div>
          </div>
          <div>
            <div className="h-12 border-b border-black" />
            <div className="pt-1">Course adviser signature &amp; date</div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-12 text-sm">
          <div>
            <div className="h-12 border-b border-black" />
            <div className="pt-1">HOD approval &amp; date</div>
          </div>
          <div>
            <div className="grid h-12 place-items-center rounded border-2 border-dashed border-black/40 text-[8px] uppercase">
              Department stamp
            </div>
            <div className="pt-1 text-center">Official use</div>
          </div>
        </div>

        <footer className="border-t border-black/40 pt-2 text-center text-[10px] uppercase tracking-widest text-black/60">
          This is a computer-generated document · EduPortal
        </footer>
      </div>
    </div>
  );
}
