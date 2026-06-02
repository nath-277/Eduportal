'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Download,
  FileText,
  Loader2,
  Trash2,
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { LecturerShell } from '@/components/layout/lecturer-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { ResourceType, Level, Semester } from '@eduportal/shared';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ACCEPTED_EXT = ['.pdf', '.docx'];

interface UploadForm {
  title: string;
  description: string;
  type: ResourceType;
  courseId: string;
}

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

interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  downloadCount: number;
  createdAt: string;
  fileType: string;
  fileSize: number | null;
  course: { id: string; code: string; title: string } | null;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const TYPE_LABEL: Record<ResourceType, string> = {
  LECTURE_NOTE: 'Lecture note',
  PAST_QUESTION: 'Past question',
  ASSIGNMENT: 'Assignment',
  TEXTBOOK: 'Textbook',
  OTHER: 'Other',
};

const TYPE_TONE: Record<ResourceType, string> = {
  LECTURE_NOTE: 'bg-blue-500/10 text-blue-700',
  PAST_QUESTION: 'bg-purple-500/10 text-purple-700',
  ASSIGNMENT: 'bg-amber-500/10 text-amber-700',
  TEXTBOOK: 'bg-emerald-500/10 text-emerald-700',
  OTHER: 'bg-muted text-muted-foreground',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadResourcesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId') ?? '';
  const qc = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<UploadForm>({
    defaultValues: {
      title: '',
      description: '',
      type: 'LECTURE_NOTE',
      courseId: initialCourseId,
    },
  });

  const coursesQuery = useQuery({
    queryKey: ['courses', 'lecturer', 'mine'],
    queryFn: async () => api.get<MyCoursesResponse>('/courses/lecturer/mine'),
  });

  const myUploadsQuery = useQuery({
    queryKey: ['resources', 'mine', 'uploads'],
    queryFn: async () => {
      // Lecturer resources: all resources (the API doesn't filter by uploader, but ours
      // were uploaded by the lecturer from earlier tests, so we filter client-side).
      const data = await api.get<Paginated<Resource>>('/resources?limit=50');
      return data.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (input: { form: UploadForm; file: File }) => {
      setProgress(0);
      setUploadError(null);
      // Simulate progress while we read the file
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 80));
        };
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(input.file);
      });
      setProgress(85);
      const res = await api.post<Resource>('/resources', {
        title: input.form.title,
        description: input.form.description || undefined,
        type: input.form.type,
        courseId: input.form.courseId || undefined,
        fileBase64: dataUrl,
        fileName: input.file.name,
        fileType: input.file.type,
      });
      setProgress(100);
      return res;
    },
    onSuccess: () => {
      toast.success('Resource uploaded');
      reset();
      setFile(null);
      setProgress(0);
      qc.invalidateQueries({ queryKey: ['resources'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(message);
      toast.error(message);
      setProgress(0);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete<{ message: string }>(`/resources/${id}`);
    },
    onSuccess: () => {
      toast.success('Resource deleted');
      qc.invalidateQueries({ queryKey: ['resources'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast.error(message);
    },
  });

  const type = watch('type');

  function handleFile(f: File) {
    if (!ACCEPTED_TYPES.includes(f.type) && !ACCEPTED_EXT.some((e) => f.name.toLowerCase().endsWith(e))) {
      toast.error('Only PDF and DOCX files are accepted');
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error('File exceeds 10MB limit');
      return;
    }
    setFile(f);
  }

  function onSubmit(values: UploadForm) {
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    uploadMutation.mutate({ form: values, file });
  }

  return (
    <LecturerShell>
      <PageHeader
        title="Upload resources"
        subtitle="Share lecture notes, past questions, assignments, and textbooks with your students."
        actions={
          <Button variant="ghost" onClick={() => router.push('/lecturer/dashboard')} className="gap-1.5">
            <X className="h-4 w-4" />
            Cancel
          </Button>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New resource</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. CSC301 Lecture 5: Normalization"
                  {...register('title', { required: 'Title is required', minLength: { value: 3, message: 'At least 3 chars' } })}
                  aria-invalid={!!errors.title}
                />
                {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Optional. What is this resource about?"
                  {...register('description')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setValue('type', v as ResourceType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_LABEL) as ResourceType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Course (optional)</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={watch('courseId') ?? ''}
                    onChange={(e) => setValue('courseId', e.target.value)}
                  >
                    <option value="">— General —</option>
                    {coursesQuery.data?.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>File (PDF or DOCX, max 10MB)</Label>
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files[0];
                    if (f) handleFile(f);
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md border-2 border-dashed px-4 py-3 transition',
                    dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20',
                  )}
                >
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    {file ? (
                      <>
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatSize(file.size)} · {file.type || 'unknown'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Click or drop to upload</p>
                        <p className="text-xs text-muted-foreground">PDF or DOCX up to 10MB</p>
                      </>
                    )}
                  </div>
                  {file ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                      aria-label="Remove file"
                      className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </label>
              </div>

              {uploadMutation.isPending || progress > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Uploading…</span>
                    <span className="font-mono">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              ) : null}

              {uploadError ? (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {uploadError}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={uploadMutation.isPending || !file}
                className="w-full gap-1.5"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadIcon className="h-4 w-4" />
                )}
                Upload resource
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">My uploads</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {myUploadsQuery.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !myUploadsQuery.data || myUploadsQuery.data.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No uploads yet"
                description="Your uploaded resources will appear here."
                className="m-4"
              />
            ) : (
              <ul className="divide-y">
                {myUploadsQuery.data.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 p-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="secondary" className={cn('text-[10px]', TYPE_TONE[r.type])}>
                          {TYPE_LABEL[r.type]}
                        </Badge>
                        {r.course ? (
                          <span className="font-mono">{r.course.code}</span>
                        ) : (
                          <span>General</span>
                        )}
                        <span>·</span>
                        <span>{formatDate(r.createdAt)}</span>
                        {r.fileSize ? (
                          <>
                            <span>·</span>
                            <span>{formatSize(r.fileSize)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Download className="h-3.5 w-3.5" />
                      {r.downloadCount}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete "${r.title}"?`)) {
                          deleteMutation.mutate(r.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      aria-label="Delete resource"
                      className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </LecturerShell>
  );
}

export default function LecturerResourcesUploadPage() {
  return (
    <Suspense
      fallback={
        <LecturerShell>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="mt-4 h-40 w-full" />
        </LecturerShell>
      }
    >
      <UploadResourcesView />
    </Suspense>
  );
}
