'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { LecturerShell } from '@/components/layout/lecturer-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { Level, Semester } from '@eduportal/shared';

interface Course {
  id: string;
  code: string;
  title: string;
  level: Level;
  semester: Semester;
  creditUnits: number;
}

interface MyCoursesResponse {
  session: { id: string; name: string; isCurrent: boolean };
  courses: Course[];
}

interface EnrolledStudent {
  id: string;
  fullname: string;
  matricNumber: string | null;
  level: Level | null;
}

interface EnrollmentResponse {
  course: { id: string; code: string; title: string };
  session: { id: string; name: string };
  count: number;
  students: EnrolledStudent[];
}

interface ResultRow {
  matricNumber: string;
  fullname: string;
  caScore: number | '';
  examScore: number | '';
}

interface ParsedRow {
  matricNumber: string;
  caScore: number;
  examScore: number;
}

interface UploadSummary {
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ matricNumber: string; reason: string }>;
}

const STEPS = [
  { id: 1, label: 'Context' },
  { id: 2, label: 'Method' },
  { id: 3, label: 'Enter scores' },
  { id: 4, label: 'Preview & submit' },
] as const;

function gradeFromTotal(total: number): string {
  if (total >= 70) return 'A';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 45) return 'D';
  if (total >= 40) return 'E';
  return 'F';
}

const GRADE_TONE: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-700',
  B: 'bg-blue-500/15 text-blue-700',
  C: 'bg-amber-500/15 text-amber-700',
  D: 'bg-orange-500/15 text-orange-700',
  E: 'bg-rose-500/15 text-rose-700',
  F: 'bg-red-600/15 text-red-700',
};

function StepBar({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="mb-6 flex items-center gap-2 overflow-x-auto">
      {STEPS.map((s, i) => {
        const isDone = step > s.id;
        const isActive = step === s.id;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition',
                isDone
                  ? 'border-primary bg-primary text-primary-foreground'
                  : isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground',
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : s.id}
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ContextStep({
  courseId,
  setCourseId,
  sessionName,
  semester,
  setSemester,
  courses,
  isLoading,
}: {
  courseId: string;
  setCourseId: (v: string) => void;
  sessionName: string;
  semester: Semester;
  setSemester: (v: Semester) => void;
  courses: Course[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Select context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Course</Label>
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title} ({c.level} {c.semester})
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Academic session</Label>
          <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
            {sessionName} <span className="ml-2 text-xs text-muted-foreground">(current)</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Semester</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['FIRST', 'SECOND'] as const).map((s) => {
              const active = semester === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSemester(s)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/40',
                  )}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()} semester
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MethodStep({
  method,
  setMethod,
}: {
  method: 'manual' | 'csv' | 'spreadsheet';
  setMethod: (m: 'manual' | 'csv' | 'spreadsheet') => void;
}) {
  const options = [
    {
      id: 'manual' as const,
      title: 'Manual entry',
      desc: 'Type in each student\'s CA and exam scores directly.',
      icon: Pencil,
    },
    {
      id: 'csv' as const,
      title: 'CSV upload',
      desc: 'Upload a CSV file with matric, caScore, and examScore columns.',
      icon: FileText,
    },
    {
      id: 'spreadsheet' as const,
      title: 'Spreadsheet',
      desc: 'Same as CSV — paste from a spreadsheet or download a template.',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Choose upload method</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {options.map((o) => {
          const active = method === o.id;
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setMethod(o.id)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition',
                active
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:border-primary/40',
              )}
            >
              <Icon className="h-6 w-6 text-primary" />
              <p className="text-sm font-semibold">{o.title}</p>
              <p className="text-xs text-muted-foreground">{o.desc}</p>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ManualEntry({
  rows,
  setRows,
  enrolled,
}: {
  rows: ResultRow[];
  setRows: (rows: ResultRow[]) => void;
  enrolled: EnrolledStudent[];
}) {
  function loadFromEnrolled() {
    const next: ResultRow[] = enrolled
      .filter((s) => s.matricNumber)
      .map((s) => ({
        matricNumber: s.matricNumber!,
        fullname: s.fullname,
        caScore: '',
        examScore: '',
      }));
    setRows(next);
  }

  function updateRow(i: number, patch: Partial<ResultRow>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    setRows(rows.filter((_, idx) => idx !== i));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Enter scores manually</CardTitle>
          <Button size="sm" variant="outline" onClick={loadFromEnrolled} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Add from enrolled list ({enrolled.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={Pencil}
            title="No students added"
            description="Click Add from enrolled list, or type a matric number to start."
            className="m-4"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">S/N</th>
                  <th className="px-3 py-2 text-left">Matric</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">CA (0-40)</th>
                  <th className="px-3 py-2 text-left">Exam (0-60)</th>
                  <th className="px-3 py-2 text-left">Total</th>
                  <th className="px-3 py-2 text-left">Grade</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, i) => {
                  const ca = r.caScore === '' ? null : Number(r.caScore);
                  const ex = r.examScore === '' ? null : Number(r.examScore);
                  const total = ca !== null && ex !== null ? ca + ex : null;
                  const grade = total !== null ? gradeFromTotal(total) : '';
                  const caError = ca !== null && (ca < 0 || ca > 40);
                  const exError = ex !== null && (ex < 0 || ex > 60);
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        <Input
                          value={r.matricNumber}
                          onChange={(e) => updateRow(i, { matricNumber: e.target.value })}
                          placeholder="CSC/2021/001"
                          className="h-8 w-32 font-mono text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={r.fullname}
                          onChange={(e) => updateRow(i, { fullname: e.target.value })}
                          placeholder="Student name"
                          className="h-8 w-40 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={40}
                          value={r.caScore}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateRow(i, { caScore: v === '' ? '' : Number(v) });
                          }}
                          className={cn('h-8 w-20 text-xs', caError && 'border-destructive')}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={60}
                          value={r.examScore}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateRow(i, { examScore: v === '' ? '' : Number(v) });
                          }}
                          className={cn('h-8 w-20 text-xs', exError && 'border-destructive')}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{total ?? '—'}</td>
                      <td className="px-3 py-2">
                        {grade ? (
                          <span
                            className={cn(
                              'inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold',
                              GRADE_TONE[grade],
                            )}
                          >
                            {grade}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          aria-label="Remove row"
                          className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CsvUpload({
  rows,
  setRows,
  errors,
}: {
  rows: ParsedRow[];
  setRows: (rows: ParsedRow[]) => void;
  errors: string[];
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function downloadTemplate() {
    const csv = 'matricNumber,caScore,examScore\nCSC/2021/001,30,55\nCSC/2021/002,28,48\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseCsvText(text: string): { rows: ParsedRow[]; errors: string[] } {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return { rows: [], errors: ['Empty file'] };

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const matricIdx = header.findIndex((h) => h.includes('matric'));
    const caIdx = header.findIndex((h) => h.includes('ca'));
    const examIdx = header.findIndex((h) => h.includes('exam'));
    if (matricIdx < 0 || caIdx < 0 || examIdx < 0) {
      return {
        rows: [],
        errors: ['Missing required columns: matricNumber, caScore, examScore'],
      };
    }

    const rows: ParsedRow[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map((c) => c.trim());
      const matric = cells[matricIdx] ?? '';
      const ca = Number(cells[caIdx]);
      const exam = Number(cells[examIdx]);
      if (!matric) {
        errors.push(`Row ${i + 1}: empty matric number`);
        continue;
      }
      if (Number.isNaN(ca) || ca < 0 || ca > 40) {
        errors.push(`Row ${i + 1} (${matric}): invalid CA score "${cells[caIdx]}"`);
        continue;
      }
      if (Number.isNaN(exam) || exam < 0 || exam > 60) {
        errors.push(`Row ${i + 1} (${matric}): invalid exam score "${cells[examIdx]}"`);
        continue;
      }
      rows.push({ matricNumber: matric, caScore: ca, examScore: exam });
    }
    return { rows, errors };
  }

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const parsed = parseCsvText(text);
      setRows(parsed.rows);
      if (parsed.errors.length > 0) {
        toast.warning(`${parsed.errors.length} row(s) have validation errors`);
      } else {
        toast.success(`Parsed ${parsed.rows.length} rows from CSV`);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Upload CSV</CardTitle>
            <Button size="sm" variant="ghost" onClick={downloadTemplate} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Download template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition',
              dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20',
            )}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <UploadIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {fileName ? `Selected: ${fileName}` : 'Drop CSV here or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground">
              Required columns: matricNumber, caScore (0-40), examScore (0-60)
            </p>
          </label>
        </CardContent>
      </Card>

      {rows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parsed preview ({rows.length} rows)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Matric</th>
                    <th className="px-3 py-2 text-left">CA</th>
                    <th className="px-3 py-2 text-left">Exam</th>
                    <th className="px-3 py-2 text-left">Total</th>
                    <th className="px-3 py-2 text-left">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r, i) => {
                    const total = r.caScore + r.examScore;
                    const grade = gradeFromTotal(total);
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs">{r.matricNumber}</td>
                        <td className="px-3 py-2">{r.caScore}</td>
                        <td className="px-3 py-2">{r.examScore}</td>
                        <td className="px-3 py-2 font-mono">{total}</td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              'inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold',
                              GRADE_TONE[grade],
                            )}
                          >
                            {grade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {errors.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Validation errors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs">
              {errors.map((e, i) => (
                <li key={i} className="rounded bg-destructive/10 px-2 py-1 text-destructive">
                  {e}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function PreviewStep({
  rows,
  courseCode,
  sessionName,
  semester,
}: {
  rows: ResultRow[];
  courseCode: string;
  sessionName: string;
  semester: Semester;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Preview & submit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-lg bg-muted/40 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Course</p>
            <p className="font-mono text-sm font-semibold">{courseCode}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Session</p>
            <p className="text-sm font-semibold">{sessionName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Semester</p>
            <p className="text-sm font-semibold">{semester}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Matric</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">CA</th>
                <th className="px-3 py-2 text-left">Exam</th>
                <th className="px-3 py-2 text-left">Total</th>
                <th className="px-3 py-2 text-left">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => {
                const ca = r.caScore === '' ? 0 : Number(r.caScore);
                const ex = r.examScore === '' ? 0 : Number(r.examScore);
                const total = ca + ex;
                const grade = gradeFromTotal(total);
                return (
                  <tr key={i}>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.matricNumber}</td>
                    <td className="px-3 py-2">{r.fullname}</td>
                    <td className="px-3 py-2">{r.caScore || '—'}</td>
                    <td className="px-3 py-2">{r.examScore || '—'}</td>
                    <td className="px-3 py-2 font-mono">{total}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold',
                          GRADE_TONE[grade],
                        )}
                      >
                        {grade}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SuccessState({ summary, onReset }: { summary: UploadSummary; onReset: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <div>
          <h3 className="text-lg font-semibold">Results uploaded</h3>
          <p className="text-sm text-muted-foreground">
            {summary.inserted} new, {summary.updated} updated, {summary.failed} failed
          </p>
        </div>
        {summary.errors.length > 0 ? (
          <div className="w-full max-w-md rounded-lg bg-destructive/10 p-3 text-left">
            <p className="mb-1 text-xs font-semibold text-destructive">Errors</p>
            <ul className="space-y-1 text-xs text-destructive">
              {summary.errors.slice(0, 5).map((e, i) => (
                <li key={i}>
                  {e.matricNumber}: {e.reason}
                </li>
              ))}
              {summary.errors.length > 5 ? (
                <li>... and {summary.errors.length - 5} more</li>
              ) : null}
            </ul>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset}>
            Upload more
          </Button>
          <Button asChild>
            <a href="/lecturer/dashboard">Back to dashboard</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadResultsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId') ?? '';
  const initialSemester = (searchParams.get('semester') as Semester) ?? 'FIRST';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [semester, setSemester] = useState<Semester>(initialSemester);
  const [method, setMethod] = useState<'manual' | 'csv' | 'spreadsheet'>('manual');
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<UploadSummary | null>(null);

  const coursesQuery = useQuery({
    queryKey: ['courses', 'lecturer', 'mine'],
    queryFn: async () => api.get<MyCoursesResponse>('/courses/lecturer/mine'),
  });

  const enrolledQuery = useQuery({
    queryKey: ['enrollments', 'course', courseId, 'upload'],
    queryFn: async () => {
      if (!courseId) return null;
      return api.get<EnrollmentResponse>(`/enrollments/course/${courseId}`);
    },
    enabled: !!courseId,
  });

  const upload = useMutation({
    mutationFn: async (input: {
      courseId: string;
      sessionId: string;
      semester: Semester;
      results: Array<{ matricNumber: string; caScore: number; examScore: number }>;
    }) => {
      return api.post<{ summary: UploadSummary }>('/results/upload', input);
    },
    onSuccess: (data) => {
      setSummary(data.summary);
      toast.success(
        `${data.summary.inserted} inserted, ${data.summary.updated} updated, ${data.summary.failed} failed`,
      );
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(message);
    },
  });

  const sessionId = coursesQuery.data?.session.id ?? '';
  const sessionName = coursesQuery.data?.session.name ?? '';
  const courses = coursesQuery.data?.courses ?? [];
  const selectedCourse = courses.find((c) => c.id === courseId);

  // Sync csvRows to csvErrors via the CsvUpload component
  useEffect(() => {
    // when csvRows change, ensure errors are reset on the CsvUpload side
  }, [csvRows]);

  const finalRows: ResultRow[] = useMemo(() => {
    if (method === 'manual') return rows;
    return csvRows.map((r) => ({ matricNumber: r.matricNumber, fullname: '', caScore: r.caScore, examScore: r.examScore }));
  }, [method, rows, csvRows]);

  function reset() {
    setStep(1);
    setRows([]);
    setCsvRows([]);
    setCsvErrors([]);
    setSummary(null);
  }

  function next() {
    if (step === 1) {
      if (!courseId) {
        toast.error('Please select a course');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (method === 'manual' && rows.length === 0) {
        toast.error('Add at least one student');
        return;
      }
      if ((method === 'csv' || method === 'spreadsheet') && csvRows.length === 0) {
        toast.error('Upload a CSV file with at least one row');
        return;
      }
      setStep(4);
    }
  }

  function back() {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3);
  }

  function submit() {
    const data = finalRows.map((r) => ({
      matricNumber: r.matricNumber,
      caScore: Number(r.caScore),
      examScore: Number(r.examScore),
    }));
    upload.mutate({ courseId, sessionId, semester, results: data });
  }

  if (summary) {
    return (
      <LecturerShell>
        <PageHeader title="Upload results" subtitle="Submission complete" />
        <div className="mt-6">
          <SuccessState summary={summary} onReset={reset} />
        </div>
      </LecturerShell>
    );
  }

  return (
    <LecturerShell>
      <PageHeader
        title="Upload results"
        subtitle={
          selectedCourse
            ? `${selectedCourse.code} — ${selectedCourse.title}`
            : 'Upload scores for an assigned course'
        }
        actions={
          <Button variant="ghost" onClick={() => router.push('/lecturer/dashboard')} className="gap-1.5">
            <X className="h-4 w-4" />
            Cancel
          </Button>
        }
      />

      <div className="mt-6">
        <StepBar step={step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 ? (
              <ContextStep
                courseId={courseId}
                setCourseId={setCourseId}
                sessionName={sessionName}
                semester={semester}
                setSemester={setSemester}
                courses={courses}
                isLoading={coursesQuery.isLoading}
              />
            ) : null}
            {step === 2 ? <MethodStep method={method} setMethod={setMethod} /> : null}
            {step === 3 ? (
              method === 'manual' ? (
                enrolledQuery.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <ManualEntry
                    rows={rows}
                    setRows={setRows}
                    enrolled={enrolledQuery.data?.students ?? []}
                  />
                )
              ) : (
                <CsvUpload rows={csvRows} setRows={setCsvRows} errors={csvErrors} />
              )
            ) : null}
            {step === 4 ? (
              <PreviewStep
                rows={finalRows}
                courseCode={selectedCourse?.code ?? '—'}
                sessionName={sessionName}
                semester={semester}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={back}
            disabled={step === 1}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={next} className="gap-1.5">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={upload.isPending || finalRows.length === 0}
              className="gap-1.5"
            >
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
              Submit {finalRows.length} result{finalRows.length === 1 ? '' : 's'}
            </Button>
          )}
        </div>
      </div>
    </LecturerShell>
  );
}

export default function LecturerUploadResultsPage() {
  return (
    <Suspense
      fallback={
        <LecturerShell>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="mt-4 h-40 w-full" />
        </LecturerShell>
      }
    >
      <UploadResultsView />
    </Suspense>
  );
}
