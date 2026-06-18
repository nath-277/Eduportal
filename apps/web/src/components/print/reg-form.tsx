import { BookOpen, GraduationCap } from 'lucide-react';
import Image from 'next/image';

import { useSettings } from '@/hooks/use-settings';
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
  const { data: settings } = useSettings();
  const universityName = settings?.displayName || 'University of EduPortal';
  const portalShortName = settings?.portalName || 'EduPortal';
  const portalLogoUrl = settings?.portalLogoUrl;

  const expanded = enrollments
    .map((e) => courses.find((c) => c.id === e.courseId))
    .filter((c): c is Course => Boolean(c));

  const totalUnits = expanded.reduce((acc, c) => acc + c.creditUnits, 0);

  if (expanded.length === 0) {
    return (
      <div className="print-only print-page hidden">
        <div className="mx-auto max-w-3xl border-2 border-black p-6 font-mono text-black">
          <h1 className="text-center text-xl font-bold">COURSE REGISTRATION FORM</h1>
          <p className="mt-8 text-center text-sm">
            No courses registered for {semester} semester, {session}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-only print-page hidden">
      <div className="mx-auto max-w-3xl space-y-3.5 border-2 border-black bg-white p-6 font-mono text-black text-[11px] leading-tight">
        <div className="flex flex-col items-center text-center border-b-2 border-black pb-2 gap-1.5">
          {portalLogoUrl ? (
            <Image
              src={portalLogoUrl}
              alt="Logo"
              width={150}
              height={64}
              unoptimized
              className="h-16 w-auto max-w-[200px] object-contain"
            />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-full border border-black">
              <GraduationCap className="h-5 w-5" />
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold">{universityName}</p>
            <h2 className="text-xs font-bold uppercase tracking-wide">
              Faculty of {settings?.facultyName || 'Sciences'}
            </h2>
            <h2 className="text-xs font-bold uppercase tracking-wide">
              Department of {departmentName || '—'}
            </h2>
            <p className="text-[9px] uppercase tracking-widest font-semibold">
              Course Registration &amp; Advisement Office
            </p>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold uppercase tracking-widest">Course Registration Form</h1>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider">
            {student.level?.replace('L', '')}L {session} Academic Session · {semester === 'FIRST' ? 'First' : 'Second'} Semester
          </p>
        </div>

        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr className="border-b border-black/20">
              <td className="w-1/4 py-1 font-semibold">Student name:</td>
              <td className="py-1">{student.fullname}</td>
              <td className="w-1/4 py-1 font-semibold">Matric No:</td>
              <td className="py-1">{student.matricNumber ?? '—'}</td>
            </tr>
            <tr className="border-b border-black/20">
              <td className="py-1 font-semibold">Level:</td>
              <td className="py-1">{student.level?.replace('L', 'Level ') ?? '—'}</td>
              <td className="py-1 font-semibold">Department:</td>
              <td className="py-1">{departmentName ?? '—'}</td>
            </tr>
            <tr className="border-b border-black/20">
              <td className="py-1 font-semibold">Session:</td>
              <td className="py-1">{session}</td>
              <td className="py-1 font-semibold">Semester:</td>
              <td className="py-1">{semester === 'FIRST' ? 'First' : 'Second'}</td>
            </tr>
            <tr>
              <td className="py-1 font-semibold">Email:</td>
              <td colSpan={3} className="py-1">
                {student.email}
              </td>
            </tr>
          </tbody>
        </table>

        <div>
          <h2 className="mb-1.5 flex items-center gap-2 border-b border-black pb-0.5 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="h-3.5 w-3.5" />
            Registered Courses
          </h2>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-black text-left font-semibold">
                <th className="w-8 py-1 text-center">S/N</th>
                <th className="py-1">Course Code</th>
                <th className="py-1">Course Title</th>
                <th className="py-1 text-right">Credit Units</th>
                <th className="py-1">Assigned Lecturer</th>
              </tr>
            </thead>
            <tbody>
              {expanded.map((c, i) => (
                <tr key={c.id} className="border-b border-black/20">
                  <td className="py-1 text-center">{i + 1}</td>
                  <td className="py-1 font-semibold">{c.code}</td>
                  <td className="py-1">{c.title}</td>
                  <td className="py-1 text-right tabular-nums">{c.creditUnits}</td>
                  <td className="py-1 italic text-black/60">TBA</td>
                </tr>
              ))}
              <tr className="border-t border-black font-semibold">
                <td colSpan={3} className="py-1.5 text-right uppercase">
                  Total credit units:
                </td>
                <td className="py-1.5 text-right tabular-nums">{totalUnits}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded border border-black p-2 text-[10px] italic">
          I confirm that the courses listed above are those I wish to register for this
          semester. I understand that any course dropped after the registration deadline will
          be recorded as &quot;W&quot; (withdrawn) on my transcript.
        </div>

        <div className="mt-4 grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="h-8 border-b border-black" />
            <div className="pt-0.5">Student signature &amp; date</div>
          </div>
          <div>
            <div className="h-8 border-b border-black" />
            <div className="pt-0.5">Course adviser signature &amp; date</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="h-8 border-b border-black" />
            <div className="pt-0.5">HOD approval &amp; date</div>
          </div>
          <div>
            <div className="grid h-8 place-items-center rounded border border-dashed border-black/40 text-[8px] uppercase">
              Department stamp
            </div>
            <div className="pt-0.5 text-center">Official use</div>
          </div>
        </div>

        <footer className="border-t border-black/40 pt-1 text-center text-[9px] uppercase tracking-widest text-black/60">
          This is a computer-generated document · {portalShortName}
        </footer>
      </div>
    </div>
  );
}
