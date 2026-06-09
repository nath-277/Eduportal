import { Award, BookOpen, GraduationCap } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Course, Result, User } from '@eduportal/shared';

export interface ResultSlipProps {
  student: User;
  results: Result[];
  session: string;
  gpa: number;
  cgpa: number;
  courses: Array<Pick<Course, 'id' | 'code' | 'title' | 'creditUnits'>>;
  departmentName?: string;
}

const gradeTone: Record<string, string> = {
  A: 'border-emerald-700 text-emerald-800 bg-emerald-50',
  B: 'border-blue-700 text-blue-800 bg-blue-50',
  C: 'border-amber-700 text-amber-800 bg-amber-50',
  D: 'border-orange-700 text-orange-800 bg-orange-50',
  E: 'border-rose-700 text-rose-800 bg-rose-50',
  F: 'border-red-800 text-red-900 bg-red-100',
};

export function ResultSlip({
  student,
  results,
  session,
  gpa,
  cgpa,
  courses,
  departmentName,
}: ResultSlipProps) {
  if (results.length === 0) {
    return (
      <div className="print-only print-page hidden">
        <div className="mx-auto max-w-3xl border-2 border-black p-10 font-mono text-black">
          <div className="text-center">
            <h1 className="text-2xl font-bold">STATEMENT OF RESULT</h1>
            <p className="mt-1 text-xs">No published results for {session}</p>
          </div>
          <p className="mt-12 text-center text-sm">
            Results will appear here once your lecturers publish them.
          </p>
        </div>
      </div>
    );
  }

  const totalUnits = results.reduce((acc, r) => {
    const c = courses.find((x) => x.id === r.courseId);
    return acc + (c?.creditUnits ?? 0);
  }, 0);

  const grouped = results.reduce<Record<string, typeof results>>((acc, r) => {
    const key = r.semester;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="print-only print-page hidden">
      <div className="mx-auto max-w-3xl space-y-6 border-2 border-black bg-white p-10 font-mono text-black">
        <Header />

        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-wide">STATEMENT OF RESULT</h1>
          <p className="mt-1 text-xs uppercase tracking-wider">{student.level?.replace('L', '')}L {session} Academic Session</p>
        </div>

        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-black/40">
              <td className="w-1/3 py-1.5 font-semibold">Name:</td>
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
            <tr>
              <td className="py-1.5 font-semibold">Session:</td>
              <td className="py-1.5" colSpan={3}>
                {session}
              </td>
            </tr>
          </tbody>
        </table>

        {Object.entries(grouped).map(([sem, rows]) => (
          <section key={sem}>
            <h2 className="mb-2 flex items-center gap-2 border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-wider">
              <BookOpen className="h-4 w-4" />
              {sem === 'FIRST' ? 'First' : 'Second'} Semester
            </h2>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-1.5">Code</th>
                  <th className="py-1.5">Title</th>
                  <th className="py-1.5 text-right">Units</th>
                  <th className="py-1.5 text-right">CA</th>
                  <th className="py-1.5 text-right">Exam</th>
                  <th className="py-1.5 text-right">Total</th>
                  <th className="py-1.5 text-center">Grade</th>
                  <th className="py-1.5 text-right">GP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const c = courses.find((x) => x.id === r.courseId);
                  return (
                    <tr key={r.id} className="border-b border-black/30">
                      <td className="py-1.5 font-semibold">{c?.code ?? '—'}</td>
                      <td className="py-1.5">{c?.title ?? '—'}</td>
                      <td className="py-1.5 text-right tabular-nums">{c?.creditUnits ?? '—'}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.caScore.toFixed(1)}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.examScore.toFixed(1)}</td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">
                        {r.totalScore.toFixed(1)}
                      </td>
                      <td className="py-1.5 text-center">
                        <span
                          className={cn(
                            'inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold',
                            gradeTone[r.grade] ?? 'border-black text-black',
                          )}
                        >
                          {r.grade}
                        </span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{r.gradePoint.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}

        <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Semester GPA:</span>
            <span className="text-base font-bold tabular-nums">{gpa.toFixed(2)} / 5.00</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">CGPA:</span>
            <span className="text-base font-bold tabular-nums">{cgpa.toFixed(2)} / 5.00</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total credit units:</span>
            <span className="font-bold tabular-nums">{totalUnits}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Courses passed:</span>
            <span className="font-bold tabular-nums">
              {results.filter((r) => r.gradePoint >= 1).length} / {results.length}
            </span>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-12 text-sm">
          <div>
            <div className="border-t border-black pt-1">Dean&apos;s signature &amp; stamp</div>
          </div>
          <div>
            <div className="border-t border-black pt-1">Date issued</div>
          </div>
        </div>

        <footer className="border-t border-black/40 pt-2 text-center text-[10px] uppercase tracking-widest text-black/60">
          This is a computer-generated document · EduPortal
          <span className="ml-2 inline-flex items-center gap-1">
            <Award className="h-3 w-3" /> Verified
          </span>
        </footer>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-4 border-b-2 border-black pb-3">
      <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-black">
        <GraduationCap className="h-8 w-8" />
      </div>
      <div className="flex-1 text-center">
        <p className="text-[10px] uppercase tracking-widest">University of EduPortal</p>
        <h2 className="text-base font-bold uppercase tracking-wide">
          Faculty of Computing &amp; Information Sciences
        </h2>
        <p className="text-[10px] uppercase tracking-widest">Departmental Examination Board</p>
      </div>
      <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-black/40 text-[8px] uppercase">
        Logo
      </div>
    </div>
  );
}
