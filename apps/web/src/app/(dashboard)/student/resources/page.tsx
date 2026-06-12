'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Download,
  FileText,
  Filter,
  Search,
  Star,
  X,
} from 'lucide-react';

import { StudentShell } from '@/components/layout/student-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ResourceType } from '@eduportal/shared';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Suspense } from 'react';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  type: ResourceType;
  downloadCount: number;
  createdAt: string;
  course: { id: string; code: string; title: string } | null;
  uploader: { id: string; fullname: string; avatarUrl: string | null };
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type FilterType = 'ALL' | ResourceType | 'BOOKMARKED';

const FILTER_OPTIONS: Array<{ value: FilterType; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'LECTURE_NOTE', label: 'Lecture Notes' },
  { value: 'PAST_QUESTION', label: 'Past Questions' },
  { value: 'ASSIGNMENT', label: 'Assignments' },
  { value: 'TEXTBOOK', label: 'Textbooks' },
  { value: 'BOOKMARKED', label: 'Bookmarked' },
];

const FILE_TYPE_TONE: Record<string, { color: string; bg: string; label: string }> = {
  'application/pdf': { color: 'text-red-600', bg: 'bg-red-500/10', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
    label: 'DOCX',
  },
  'application/msword': { color: 'text-blue-600', bg: 'bg-blue-500/10', label: 'DOC' },
  'application/vnd.ms-powerpoint': {
    color: 'text-orange-600',
    bg: 'bg-orange-500/10',
    label: 'PPT',
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    color: 'text-orange-600',
    bg: 'bg-orange-500/10',
    label: 'PPTX',
  },
};

function fileTypeInfo(fileType: string, fileName?: string) {
  if (FILE_TYPE_TONE[fileType]) return FILE_TYPE_TONE[fileType];
  const ext = fileName?.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return { color: 'text-red-600', bg: 'bg-red-500/10', label: 'PDF' };
  if (ext === 'docx' || ext === 'doc') return { color: 'text-blue-600', bg: 'bg-blue-500/10', label: 'DOC' };
  if (ext === 'pptx' || ext === 'ppt') return { color: 'text-orange-600', bg: 'bg-orange-500/10', label: 'PPT' };
  if (ext === 'xlsx' || ext === 'xls') return { color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'XLS' };
  if (ext === 'zip' || ext === 'rar') return { color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'ZIP' };
  return { color: 'text-muted-foreground', bg: 'bg-muted', label: 'FILE' };
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ResourceLibraryView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const saved = searchParams.get('saved') === 'true';
  const qc = useQueryClient();

  const [filter, setFilter] = useState<FilterType>(saved ? 'BOOKMARKED' : 'ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [courseId, setCourseId] = useState<string>('all');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Sync filter with URL ?saved= param
  const effectiveFilter = saved ? 'BOOKMARKED' : filter;

  // Fetch courses for filter dropdown (only ones this student could see)
  const coursesQuery = useQuery({
    queryKey: ['courses', 'all-min'],
    queryFn: async () => {
      const data = await api.get<Array<{ id: string; code: string; title: string }>>(
        '/courses?limit=100',
      );
      return data;
    },
  });

  // Fetch resources
  const resourcesQuery = useQuery({
    queryKey: ['resources', 'list', effectiveFilter, debouncedSearch, courseId],
    queryFn: async () => {
      if (effectiveFilter === 'BOOKMARKED') {
        const res = await api.get<{ data: { data: Resource[] } }>('/resources/bookmarks/mine');
        const items = res.data.data;
        return { data: items, total: items.length, page: 1, limit: items.length, totalPages: 1 };
      }
      const params = new URLSearchParams();
      if (effectiveFilter !== 'ALL') params.set('type', effectiveFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (courseId !== 'all') params.set('courseId', courseId);
      params.set('limit', '50');
      const data = await api.get<Paginated<Resource>>(`/resources?${params.toString()}`);
      return data;
    },
  });

  // Fetch bookmark ids to know which resources are bookmarked (only when filter=ALL)
  const bookmarksQuery = useQuery({
    queryKey: ['resources', 'bookmark-ids'],
    queryFn: async () => {
      const res = await api.get<{ data: { data: Resource[] } }>('/resources/bookmarks/mine');
      return new Set(res.data.data.map((r) => r.id));
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async (id: string) => {
      const data = await api.post<{ bookmarked: boolean }>(`/resources/${id}/bookmark`, {});
      return { id, bookmarked: data.bookmarked };
    },
    onSuccess: (result) => {
      toast.success(result.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
      qc.invalidateQueries({ queryKey: ['resources'] });
      qc.setQueryData<Set<string> | undefined>(['resources', 'bookmark-ids'], (prev) => {
        const next = new Set(prev ?? []);
        if (result.bookmarked) next.add(result.id);
        else next.delete(result.id);
        return next;
      });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not update bookmark');
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const data = await api.post<{ url: string }>(`/resources/${id}/download`, {});
      return data.url;
    },
    onSuccess: (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    },
  });

  const resources = resourcesQuery.data?.data ?? [];
  const bookmarkedIds = bookmarksQuery.data ?? new Set<string>();

  function handleFilterChange(next: FilterType) {
    setFilter(next);
    if (next === 'BOOKMARKED' || saved) {
      router.replace(next === 'BOOKMARKED' ? `${pathname}?saved=true` : pathname);
    }
  }

  function clearSaved() {
    router.replace(pathname);
  }

  return (
    <StudentShell>
      <PageHeader
        title={saved ? 'Saved resources' : 'Resource library'}
        subtitle={
          saved
            ? 'Resources you have bookmarked for quick access.'
            : 'Lecture notes, past questions, and other course materials uploaded by lecturers.'
        }
      />

      {saved ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="flex-1">Viewing your saved resources.</span>
          <Button size="sm" variant="ghost" onClick={clearSaved} className="h-7 gap-1">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      ) : null}

      {/* Search + Course filter */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or description..."
            className="pl-9"
          />
        </div>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <Filter className="h-4 w-4" />
            <SelectValue placeholder="All courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {coursesQuery.data?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} — {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter chips */}
      <div className="mt-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {FILTER_OPTIONS.map((opt) => {
          const active = effectiveFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleFilterChange(opt.value)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Resource grid */}
      <div className="mt-6">
        {resourcesQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No resources found"
            description={
              effectiveFilter === 'BOOKMARKED'
                ? 'You have not saved any resources yet. Tap the bookmark icon on a resource to save it.'
                : debouncedSearch
                  ? `No resources match "${debouncedSearch}".`
                  : 'No resources have been uploaded yet. Check back later.'
            }
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.04 } },
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence>
              {resources.map((r) => {
                const tone = fileTypeInfo(r.fileType, r.fileUrl);
                const isBookmarked = effectiveFilter === 'BOOKMARKED' || bookmarkedIds.has(r.id);
                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                  >
                    <Card className="group h-full transition hover:border-primary/40 hover:shadow-md">
                      <CardContent className="flex h-full flex-col p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'grid h-11 w-11 shrink-0 place-items-center rounded-lg',
                              tone.bg,
                            )}
                          >
                            <FileText className={cn('h-5 w-5', tone.color)} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Badge variant="secondary" className={cn('text-[10px]', tone.color, tone.bg)}>
                              {tone.label}
                            </Badge>
                            <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug">
                              {r.title}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => bookmarkMutation.mutate(r.id)}
                            disabled={bookmarkMutation.isPending}
                            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                            className={cn(
                              'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition',
                              isBookmarked
                                ? 'text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="h-4 w-4 fill-primary" />
                            ) : (
                              <Bookmark className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        {r.description ? (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {r.course ? (
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {r.course.code}
                            </Badge>
                          ) : null}
                          <span>·</span>
                          <span>{r.uploader.fullname}</span>
                          <span>·</span>
                          <span>{formatDate(r.createdAt)}</span>
                        </div>

                        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Download className="h-3.5 w-3.5" />
                            <span>{r.downloadCount}</span>
                            {r.fileSize ? <span>· {formatSize(r.fileSize)}</span> : null}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={downloadMutation.isPending}
                            onClick={() => downloadMutation.mutate(r.id)}
                            className="gap-1.5"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </StudentShell>
  );
}

export default function StudentResourcesPage() {
  return (
    <Suspense fallback={<StudentShell><div className="space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-32 w-full" /></div></StudentShell>}>
      <ResourceLibraryView />
    </Suspense>
  );
}
