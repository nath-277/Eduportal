import { BookOpen, GraduationCap } from 'lucide-react';

import type { Course, Semester, User } from '@eduportal/shared';

export interface ExamDocketProps {
  student: User;
  courses: Course[];
  session: string;
  semester: Semester;
  departmentName?: string;
}

export function ExamDocket({
  student,
  courses,
  session,
  semester,
  departmentName,
}: ExamDocketProps) {
  if (courses.length === 0) {
    return (
      <div className="print-only print-page hidden">
        <div className="mx-auto max-w-3xl border-2 border-black p-10 font-mono text-black">
          <h1 className="text-center text-2xl font-bold">EXAMINATION DOCKET</h1>
          <p className="mt-12 text-center text-sm">
            You have no courses registered for {semester} semester, {session}.
          </p>
        </div>
      </div>
    );
  }

  const totalUnits = courses.reduce((acc, c) => acc + c.creditUnits, 0);

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
            <p className="text-[10px] uppercase tracking-widest">Examinations Office</p>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-black/40 text-[8px] uppercase">
            Logo
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-extrabold uppercase tracking-widest">Examination Docket</h1>
          <p className="mt-1 text-xs uppercase tracking-wider">
            {session} · {semester === 'FIRST' ? 'First' : 'Second'} Semester
          </p>
        </div>

        <div className="flex items-start gap-4 border-2 border-black p-4">
          <div className="grid h-24 w-20 place-items-center rounded border-2 border-dashed border-black/50 text-[8px] uppercase">
            Passport<br />Photo
          </div>
          <div className="flex-1 text-sm">
            <DetailRow label="Name" value={student.fullname} />
            <DetailRow label="Matric number" value={student.matricNumber ?? '—'} />
            <DetailRow label="Level" value={student.level?.replace('L', 'Level ') ?? '—'} />
            <DetailRow label="Department" value={departmentName ?? '—'} />
            <DetailRow label="Session" value={session} />
          </div>
        </div>

        <div>
          <h2 className="mb-2 flex items-center gap-2 border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-wider">
            <BookOpen className="h-4 w-4" />
            Registered Courses
          </h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="w-10 py-1.5 text-center">S/N</th>
                <th className="py-1.5">Code</th>
                <th className="py-1.5">Course Title</th>
                <th className="py-1.5 text-right">Units</th>
                <th className="py-1.5">Lecturer</th>
                <th className="py-1.5 text-center">Date</th>
                <th className="py-1.5 text-center">Venue</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr key={c.id} className="border-b border-black/30">
                  <td className="py-2 text-center">{i + 1}</td>
                  <td className="py-2 font-semibold">{c.code}</td>
                  <td className="py-2">{c.title}</td>
                  <td className="py-2 text-right tabular-nums">{c.creditUnits}</td>
                  <td className="py-2 italic text-black/60">TBA</td>
                  <td className="py-2 text-center italic text-black/60">— —</td>
                  <td className="py-2 text-center italic text-black/60">—</td>
                </tr>
              ))}
              <tr className="border-t-2 border-black">
                <td colSpan={3} className="py-2 text-right font-bold uppercase">
                  Total credit units:
                </td>
                <td className="py-2 text-right font-bold tabular-nums">{totalUnits}</td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded border-2 border-black p-3 text-xs italic">
          I, <span className="font-semibold not-italic">{student.fullname}</span> (
          {student.matricNumber ?? '—'}), certify that I have paid all required fees and am
          eligible to sit the examinations listed above. I understand that any breach of the
          examination regulations will be treated as a disciplinary matter.
        </div>

        <div className="mt-8 grid grid-cols-2 gap-12 text-sm">
          <div>
            <div className="h-12 border-b border-black" />
            <div className="pt-1">Student signature &amp; date</div>
          </div>
          <div>
            <div className="h-12 border-b border-black" />
            <div className="pt-1">Date submitted</div>
          </div>
        </div>

        <div className="mt-8 border-t-2 border-dashed border-black/40 pt-3 text-center text-[10px] uppercase tracking-widest text-black/60">
          Invigilator&apos;s use only
        </div>
        <div className="grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="h-10 border-b border-black" />
            <div className="pt-1">Invigilator signature</div>
          </div>
          <div>
            <div className="h-10 border-b border-black" />
            <div className="pt-1">Chief invigilator stamp</div>
          </div>
        </div>

        <footer className="border-t border-black/40 pt-2 text-center text-[10px] uppercase tracking-widest text-black/60">
          This docket must be presented at every examination venue · EduPortal
        </footer>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-black/20 py-1 last:border-b-0">
      <span className="font-semibold">{label}:</span>
      <span>{value}</span>
    </div>
  );
}
