import { BookOpen, GraduationCap } from 'lucide-react';

import { useSettings } from '@/hooks/use-settings';
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
  const { data: settings } = useSettings();
  const universityName = settings?.displayName || 'University of EduPortal';
  const portalShortName = settings?.portalName || 'EduPortal';
  const portalLogoUrl = settings?.portalLogoUrl;

  if (courses.length === 0) {
    return (
      <div className="print-only print-page hidden">
        <div className="mx-auto max-w-3xl border-2 border-black p-6 font-mono text-black">
          <h1 className="text-center text-xl font-bold">EXAMINATION DOCKET</h1>
          <p className="mt-8 text-center text-sm">
            You have no courses registered for {semester} semester, {session}.
          </p>
        </div>
      </div>
    );
  }

  const totalUnits = courses.reduce((acc, c) => acc + c.creditUnits, 0);

  return (
    <div className="print-only print-page hidden">
      <div className="mx-auto max-w-3xl space-y-3.5 border-2 border-black bg-white p-6 font-mono text-black text-[11px] leading-tight">
        <div className="flex flex-col items-center text-center border-b-2 border-black pb-2 gap-1.5">
          {portalLogoUrl ? (
            <img src={portalLogoUrl} alt="Logo" className="h-16 w-auto max-w-[200px] object-contain" />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-full border border-black">
              <GraduationCap className="h-5 w-5" />
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold">{universityName}</p>
            <h2 className="text-xs font-bold uppercase tracking-wide">
              Faculty of {settings?.facultyName || 'Computing & Information Sciences'}, Department of {departmentName || '—'}
            </h2>
            <p className="text-[9px] uppercase tracking-widest font-semibold">Examinations Office</p>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold uppercase tracking-widest">Examination Docket</h1>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider">
            {student.level?.replace('L', '')}L {session} · {semester === 'FIRST' ? 'First' : 'Second'} Semester
          </p>
        </div>

        <div className="flex items-start gap-4 border border-black p-2.5">
          <div className="grid h-20 w-16 place-items-center rounded border border-dashed border-black/50 text-[8px] uppercase">
            Passport<br />Photo
          </div>
          <div className="flex-1 text-xs">
            <DetailRow label="Name" value={student.fullname} />
            <DetailRow label="Matric number" value={student.matricNumber ?? '—'} />
            <DetailRow label="Level" value={student.level?.replace('L', 'Level ') ?? '—'} />
            <DetailRow label="Department" value={departmentName ?? '—'} />
            <DetailRow label="Session" value={session} />
          </div>
        </div>

        <div>
          <h2 className="mb-1 flex items-center gap-2 border-b border-black pb-0.5 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="h-3.5 w-3.5" />
            Registered Courses
          </h2>
          <table className="w-full border border-black border-collapse text-[10px]">
            <thead>
              <tr className="bg-black/5 border-b border-black text-left">
                <th className="w-8 py-1 text-center border-r border-black font-semibold">S/N</th>
                <th className="w-16 py-1 px-1.5 border-r border-black font-semibold">Code</th>
                <th className="py-1 px-1.5 border-r border-black font-semibold">Course Title</th>
                <th className="w-12 py-1 px-1.5 text-right border-r border-black font-semibold">Units</th>
                <th className="w-20 py-1 px-1.5 text-center border-r border-black font-semibold">Date</th>
                <th className="w-16 py-1 px-1.5 text-center border-r border-black font-semibold">Venue</th>
                <th className="w-32 py-1 px-1.5 text-center font-semibold">Invigilator Sign</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr key={c.id} className="border-b border-black">
                  <td className="py-1.5 text-center border-r border-black">{i + 1}</td>
                  <td className="py-1.5 px-1.5 font-semibold border-r border-black">{c.code}</td>
                  <td className="py-1.5 px-1.5 border-r border-black">{c.title}</td>
                  <td className="py-1.5 px-1.5 text-right tabular-nums border-r border-black">{c.creditUnits}</td>
                  <td className="py-1.5 px-1.5 text-center italic text-black/60 border-r border-black">— —</td>
                  <td className="py-1.5 px-1.5 text-center italic text-black/60 border-r border-black">—</td>
                  <td className="py-1.5 px-1.5"></td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td colSpan={3} className="py-1.5 px-1.5 text-right uppercase border-r border-black">
                  Total credit units:
                </td>
                <td className="py-1.5 px-1.5 text-right tabular-nums border-r border-black">{totalUnits}</td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded border border-black p-2 text-[10px] italic">
          I, <span className="font-semibold not-italic">{student.fullname}</span> (
          {student.matricNumber ?? '—'}), certify that I have paid all required fees and am
          eligible to sit the examinations listed above. I understand that any breach of the
          examination regulations will be treated as a disciplinary matter.
        </div>

        <div className="grid grid-cols-2 gap-8 text-xs pt-1">
          <div>
            <div className="h-8 border-b border-black" />
            <div className="pt-0.5">Student signature &amp; date</div>
          </div>
          <div>
            <div className="h-8 border-b border-black" />
            <div className="pt-0.5">Date submitted</div>
          </div>
        </div>

        <div className="border-t border-dashed border-black/40 pt-1 text-center text-[9px] uppercase tracking-widest text-black/60">
          Invigilator&apos;s use only
        </div>
        <div className="grid grid-cols-2 gap-8 text-[11px]">
          <div>
            <div className="h-8 border-b border-black" />
            <div className="pt-0.5">Invigilator signature</div>
          </div>
          <div>
            <div className="h-8 border-b border-black" />
            <div className="pt-0.5">Chief invigilator stamp</div>
          </div>
        </div>

        <footer className="border-t border-black/40 pt-1 text-center text-[9px] uppercase tracking-widest text-black/60">
          This docket must be presented at every examination venue · {portalShortName}
        </footer>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-black/10 py-0.5 last:border-b-0">
      <span className="font-semibold">{label}:</span>
      <span>{value}</span>
    </div>
  );
}
