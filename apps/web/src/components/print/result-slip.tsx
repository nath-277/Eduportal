import type { Semester, User } from '@eduportal/shared';
import { useSettings } from '@/hooks/use-settings';
import { GraduationCap } from 'lucide-react';

export interface ResultRow {
  id: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
  course: {
    id: string;
    code: string;
    title: string;
    creditUnits: number;
    level: string;
  };
  session: { id: string; name: string };
  semester: Semester;
}

export interface SemesterSummary {
  sessionId: string;
  sessionName: string;
  semester: Semester;
  gpa: number;
  results: ResultRow[];
}

export interface Session {
  id: string;
  name: string;
  isCurrent: boolean;
}

export interface ResultSlipProps {
  student: User;
  allSemesters: SemesterSummary[];
  activeSessionId: string;
  selectedSemester: Semester;
  sessions: Session[];
  departmentName?: string;
}

export function ResultSlip({
  student,
  allSemesters,
  activeSessionId,
  selectedSemester,
  sessions,
  departmentName,
}: ResultSlipProps) {
  const { data: settings } = useSettings();

  // If missing critical selection parameters, return null
  if (!activeSessionId || !selectedSemester || sessions.length === 0) {
    return null;
  }

  // 1. Sort sessions chronologically by name
  const sortedSessions = [...sessions].sort((a, b) => a.name.localeCompare(b.name));

  // Helper to get semester chronological rank
  const getSemesterRank = (sessId: string, sem: Semester) => {
    const idx = sortedSessions.findIndex((s) => s.id === sessId);
    if (idx === -1) return -1;
    return idx * 2 + (sem === 'FIRST' ? 0 : 1);
  };

  const currentRank = getSemesterRank(activeSessionId, selectedSemester);

  // Filter results into CURRENT, PREVIOUS, and CUMMULATIVE
  const currentSemesterSummary = allSemesters.find(
    (sem) => sem.sessionId === activeSessionId && sem.semester === selectedSemester
  );
  const currentResults = currentSemesterSummary?.results || [];

  // If no results for the current semester, show a clean message
  if (currentResults.length === 0) {
    const sessionName = sessions.find((s) => s.id === activeSessionId)?.name || 'selected';
    return (
      <div className="print-only print-page hidden">
        <div className="mx-auto max-w-4xl border border-black p-10 font-sans text-black">
          <div className="text-center">
            <h1 className="text-xl font-bold uppercase tracking-wider">STATEMENT OF RESULT</h1>
            <p className="mt-2 text-xs">No published results for {sessionName} ({selectedSemester === 'FIRST' ? 'First' : 'Second'} Semester)</p>
          </div>
          <p className="mt-12 text-center text-xs text-gray-500">
            Results will appear here once your lecturers publish them.
          </p>
        </div>
      </div>
    );
  }

  const previousResults: ResultRow[] = [];
  const cumulativeResults: ResultRow[] = [];

  allSemesters.forEach((sem) => {
    const rk = getSemesterRank(sem.sessionId, sem.semester);
    if (rk !== -1) {
      if (rk < currentRank) {
        previousResults.push(...sem.results);
      }
      if (rk <= currentRank) {
        cumulativeResults.push(...sem.results);
      }
    }
  });

  // Calculate statistics
  const calculateStats = (rows: ResultRow[]) => {
    const tcc = rows.reduce((acc, r) => acc + (r.course.creditUnits ?? 0), 0);
    const tce = rows.reduce((acc, r) => acc + (r.gradePoint > 0 ? (r.course.creditUnits ?? 0) : 0), 0);
    const tgp = rows.reduce((acc, r) => acc + (r.gradePoint * (r.course.creditUnits ?? 0)), 0);
    const gpa = tcc === 0 ? 0 : tgp / tcc;
    return { tcc, tce, tgp, gpa };
  };

  const currentStats = calculateStats(currentResults);
  const previousStats = calculateStats(previousResults);
  const cumulativeStats = calculateStats(cumulativeResults);

  // Extract level dynamically from course levels
  const getSessionLevel = (rows: ResultRow[]): string => {
    if (rows.length === 0) return '';
    const levels = rows.map((r) => r.course.level).filter(Boolean);
    if (levels.length === 0) return '';
    const numericLevels = levels.map((l) => {
      const match = l.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const maxLevel = Math.max(...numericLevels);
    return maxLevel > 0 ? `${maxLevel}` : '';
  };

  let levelStr = getSessionLevel(currentResults);
  if (!levelStr && student.level) {
    const match = student.level.match(/\d+/);
    levelStr = match ? match[0] : '';
  }

  const sessionName = sessions.find((s) => s.id === activeSessionId)?.name || '';
  const facultyName = settings?.facultyName || 'Science';
  const departmentNameVal = departmentName || student.department?.name || 'Computing';
  const programmeName = student.programme?.name || 'B.Sc. Computer Science';
  const universityName = settings?.displayName || 'ANCHOR UNIVERSITY, LAGOS';
  const portalLogoUrl = settings?.portalLogoUrl;

  return (
    <div className="print-only print-page hidden">
      <div className="mx-auto max-w-4xl bg-white p-6 font-sans text-black text-[11px] leading-normal">
        {/* Top Box: University Identity & Logo Header */}
        <div className="w-full border border-gray-300 p-4 mb-4 flex flex-col items-center justify-center text-center gap-3">
          <h1 className="text-2xl font-extrabold uppercase tracking-wide text-foreground/90">
            {universityName}
          </h1>
          {portalLogoUrl ? (
            <img
              src={portalLogoUrl}
              alt="University Logo"
              className="h-16 w-auto object-contain mx-auto"
            />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-full border border-gray-400">
              <GraduationCap className="h-6 w-6 text-foreground" />
            </div>
          )}
          <h2 className="text-xs font-bold uppercase tracking-widest underline underline-offset-4 mt-1">
            STATEMENT OF RESULT
          </h2>
        </div>

        {/* Box 1: Academic & Faculty Information */}
        <table className="w-full border-collapse border border-gray-300 text-[10px] mb-4">
          <tbody>
            <tr>
              <td className="py-2 px-3 w-[15%] font-extrabold text-left align-top">FACULTY:</td>
              <td className="py-2 px-3 w-[45%] font-bold text-left align-top uppercase">{facultyName}</td>
              <td className="py-2 px-3 w-[15%] font-extrabold text-left align-top">SESSION:</td>
              <td className="py-2 px-3 w-[25%] font-bold text-left align-top uppercase">{sessionName}</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-extrabold text-left align-top">DEPARTMENT:</td>
              <td className="py-2 px-3 font-bold text-left align-top uppercase">{departmentNameVal}</td>
              <td className="py-2 px-3 font-extrabold text-left align-top">SEMESTER:</td>
              <td className="py-2 px-3 font-bold text-left align-top uppercase">{selectedSemester}</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-extrabold text-left align-top">PROGRAMME:</td>
              <td className="py-2 px-3 font-bold text-left align-top uppercase">{programmeName}</td>
              <td className="py-2 px-3 font-extrabold text-left align-top">LEVEL:</td>
              <td className="py-2 px-3 font-bold text-left align-top uppercase">{levelStr}</td>
            </tr>
          </tbody>
        </table>

        {/* Box 2: Student Identity */}
        <table className="w-full border-collapse border border-gray-300 text-[10px] mb-6">
          <tbody>
            <tr>
              <td className="py-2.5 px-3 w-[15%] font-extrabold text-left align-middle">NAME:</td>
              <td className="py-2.5 px-3 w-[45%] font-bold text-left align-middle uppercase">{student.fullname}</td>
              <td className="py-2.5 px-3 w-[15%] font-extrabold text-left align-middle">MATRIC NO:</td>
              <td className="py-2.5 px-3 w-[25%] font-bold text-left align-middle uppercase">{student.matricNumber ?? '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* Main Results Table (Full Grid styling matching screenshot) */}
        <table className="w-full border-collapse border border-gray-300 text-[10px] mb-8">
          <thead>
            <tr className="border-b border-gray-300 font-extrabold text-left bg-gray-50/20">
              <th className="py-2.5 px-2 w-[5%] border-r border-gray-300 text-left">S/N</th>
              <th className="py-2.5 px-2 w-[15%] border-r border-gray-300 text-left">COURSE CODE</th>
              <th className="py-2.5 px-2 w-[43%] border-r border-gray-300 text-left">COURSE TITLE</th>
              <th className="py-2.5 px-2 w-[8%] border-r border-gray-300 text-center">UNIT</th>
              <th className="py-2.5 px-2 w-[8%] border-r border-gray-300 text-center">SCORE</th>
              <th className="py-2.5 px-2 w-[8%] border-r border-gray-300 text-center">GRADE</th>
              <th className="py-2.5 px-2 w-[13%] text-center">REMARK</th>
            </tr>
          </thead>
          <tbody>
            {currentResults.map((r, index) => {
              const remark = r.gradePoint > 0 ? 'PASSED' : 'FAILED';
              return (
                <tr key={r.id} className="border-b border-gray-300 font-semibold">
                  <td className="py-2 px-2 border-r border-gray-300 text-left">{index + 1}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-left uppercase">{r.course.code}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-left uppercase">{r.course.title}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center">{r.course.creditUnits}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center">{Math.round(r.totalScore)}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center uppercase">{r.grade}</td>
                  <td className="py-2 px-2 text-center uppercase">{remark}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Bottom Performance Blocks */}
        <div className="grid grid-cols-3 gap-6 text-[10px] mb-12">
          {/* CURRENT stats */}
          <table className="w-full border-collapse border border-gray-300 font-semibold">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50/20">
                <th colSpan={2} className="py-2 px-3 text-left font-extrabold uppercase">CURRENT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 w-[70%] text-left">TCC</td>
                <td className="py-2 px-3 w-[30%] text-center border-l border-gray-300">{currentStats.tcc}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 text-left">TCE</td>
                <td className="py-2 px-3 text-center border-l border-gray-300">{currentStats.tce}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 text-left">TGP</td>
                <td className="py-2 px-3 text-center border-l border-gray-300">{currentStats.tgp}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-left">GPA</td>
                <td className="py-2 px-3 text-center border-l border-gray-300">{currentStats.gpa.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* PREVIOUS stats */}
          <table className="w-full border-collapse border border-gray-300 font-semibold">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50/20">
                <th colSpan={2} className="py-2 px-3 text-left font-extrabold uppercase">PREVIOUS</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 w-[70%] text-left">TCC</td>
                <td className="py-2 px-3 w-[30%] text-center border-l border-gray-300">{previousStats.tcc}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 text-left">TCE</td>
                <td className="py-2 px-3 text-center border-l border-gray-300">{previousStats.tce}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 text-left">TGP</td>
                <td className="py-2 px-3 text-center border-l border-gray-300">{previousStats.tgp}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-left">GPA</td>
                <td className="py-2 px-3 text-center border-l border-gray-300">{previousStats.gpa.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* CUMMULATIVE stats */}
          <table className="w-full border-collapse border border-gray-300 font-semibold">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50/20">
                <th colSpan={2} className="py-2 px-3 text-left font-extrabold uppercase">CUMMULATIVE</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 w-[70%] text-left">TCC</td>
                <td className="py-2 px-3 w-[30%] text-center border-l border-gray-300">{cumulativeStats.tcc}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 text-left">TCE</td>
                <td className="py-2 px-3 text-center border-l border-gray-300">{cumulativeStats.tce}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-3 text-left">TGP</td>
                <td className="py-2 px-3 text-center border-l border-gray-300">{cumulativeStats.tgp}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-left">GPA</td>
                <td className="py-2 px-3 text-center border-l border-gray-300">{cumulativeStats.gpa.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature & Stamp for Officials (Registrar) */}
        <div className="mt-16 grid grid-cols-2 gap-16 text-[10px] font-bold">
          <div className="flex flex-col items-start">
            <div className="border-t border-black border-dashed pt-2 w-48 text-center uppercase">
              Registrar Sign & Stamp
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="border-t border-black border-dashed pt-2 w-48 text-center uppercase">
              Date Issued
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
