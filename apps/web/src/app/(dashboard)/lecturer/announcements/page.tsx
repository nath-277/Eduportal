'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Megaphone,
  Pin,
  Plus,
  Send,
  Trash2,
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
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { UserRole } from '@eduportal/shared';

interface Announcement {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  targetRole?: UserRole | null;
  scheduledAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  author: { id: string; fullname: string; avatarUrl?: string | null };
}

interface AnnouncementForm {
  title: string;
  body: string;
  targetRole: 'ALL' | UserRole;
  isPinned: boolean;
  schedule: boolean;
  scheduledAt: string;
  expiresAt: string;
}

function timeAgo(d: string): string {
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d2 = Math.floor(h / 24);
  if (d2 < 7) return `${d2}d ago`;
  return new Date(d).toLocaleDateString();
}

function roleLabel(r?: UserRole | null): string {
  if (!r) return 'Everyone';
  return r === 'STUDENT' ? 'Students' : r === 'LECTURER' ? 'Lecturers' : 'Admins';
}

function roleTone(r?: UserRole | null): string {
  if (!r) return 'bg-muted text-muted-foreground';
  if (r === 'STUDENT') return 'bg-blue-500/10 text-blue-700';
  if (r === 'LECTURER') return 'bg-emerald-500/10 text-emerald-700';
  return 'bg-purple-500/10 text-purple-700';
}

export default function LecturerAnnouncementsPage() {
  const qc = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<AnnouncementForm>({
    defaultValues: {
      title: '',
      body: '',
      targetRole: 'ALL',
      isPinned: false,
      schedule: false,
      scheduledAt: '',
      expiresAt: '',
    },
  });

  const announcementsQuery = useQuery({
    queryKey: ['announcements', 'all'],
    queryFn: async () => {
      const res = await api.get<Announcement[] | { data: Announcement[] }>('/announcements');
      return Array.isArray(res) ? res : res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: AnnouncementForm) => {
      const payload: Record<string, unknown> = {
        title: input.title,
        body: input.body,
        isPinned: input.isPinned,
        targetRole: input.targetRole === 'ALL' ? null : input.targetRole,
      };
      if (input.schedule) {
        if (input.scheduledAt) payload.scheduledAt = new Date(input.scheduledAt).toISOString();
        if (input.expiresAt) payload.expiresAt = new Date(input.expiresAt).toISOString();
      }
      return api.post<Announcement>('/announcements', payload);
    },
    onSuccess: (data) => {
      toast.success('Announcement published');
      reset();
      setComposerOpen(false);
      qc.invalidateQueries({ queryKey: ['announcements'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      console.log('published', data.id);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to publish';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete<{ message: string }>(`/announcements/${id}`),
    onSuccess: () => {
      toast.success('Announcement deleted');
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast.error(message);
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (a: Announcement) =>
      api.patch<{ announcement: Announcement }>(`/announcements/${a.id}`, { isPinned: !a.isPinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  });

  const schedule = watch('schedule');
  const targetRole = watch('targetRole');

  function onSubmit(values: AnnouncementForm) {
    if (values.schedule && values.scheduledAt && values.expiresAt) {
      if (new Date(values.scheduledAt) >= new Date(values.expiresAt)) {
        toast.error('Scheduled time must be before expiry');
        return;
      }
    }
    createMutation.mutate(values);
  }

  return (
    <LecturerShell>
      <PageHeader
        title="Announcements"
        subtitle="Broadcast messages to students, lecturers, or the whole department."
        actions={
          <Button
            onClick={() => setComposerOpen((s) => !s)}
            variant={composerOpen ? 'outline' : 'default'}
            className="gap-1.5"
          >
            {composerOpen ? (
              <>
                <X className="h-4 w-4" />
                Close
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                New announcement
              </>
            )}
          </Button>
        }
      />

      {composerOpen ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Compose announcement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. CSC301 mid-semester test rescheduled"
                  {...register('title', { required: 'Title is required', minLength: { value: 3, message: 'At least 3 chars' } })}
                  aria-invalid={!!errors.title}
                />
                {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  rows={5}
                  placeholder="Write the announcement here…"
                  {...register('body', { required: 'Message is required' })}
                  aria-invalid={!!errors.body}
                />
                {errors.body ? <p className="text-xs text-destructive">{errors.body.message}</p> : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Audience</Label>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {(['ALL', 'STUDENT', 'LECTURER', 'ADMIN'] as const).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setValue('targetRole', r)}
                        className={cn(
                          'rounded-md border px-2 py-1.5 text-xs font-medium transition',
                          targetRole === r
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-foreground/30',
                        )}
                      >
                        {r === 'ALL' ? 'Everyone' : roleLabel(r as UserRole)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={watch('isPinned')}
                      onChange={(e) => setValue('isPinned', e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    Pin to top
                  </Label>
                  <Label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={schedule}
                      onChange={(e) => setValue('schedule', e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    Schedule
                  </Label>
                </div>
              </div>

              {schedule ? (
                <div className="grid gap-3 rounded-md border border-dashed p-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="scheduledAt">Publish at</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      {...register('scheduledAt', { required: schedule ? 'Required' : false })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expiresAt">Expires at</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      {...register('expiresAt', { required: schedule ? 'Required' : false })}
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setComposerOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="gap-1.5">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publish
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 space-y-3">
        {announcementsQuery.isLoading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </>
        ) : !announcementsQuery.data || announcementsQuery.data.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Megaphone}
                title="No announcements yet"
                description="Published announcements appear here."
                action={
                  <Button onClick={() => setComposerOpen(true)} variant="outline" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Create your first
                  </Button>
                }
                className="m-6"
              />
            </CardContent>
          </Card>
        ) : (
          announcementsQuery.data.map((a) => (
            <AnnouncementRow
              key={a.id}
              a={a}
              onDelete={() => {
                if (confirm(`Delete "${a.title}"?`)) deleteMutation.mutate(a.id);
              }}
              onTogglePin={() => pinMutation.mutate(a)}
              pinning={pinMutation.isPending}
              deleting={deleteMutation.isPending}
            />
          ))
        )}
      </div>
    </LecturerShell>
  );
}

function AnnouncementRow({
  a,
  onDelete,
  onTogglePin,
  pinning,
  deleting,
}: {
  a: Announcement;
  onDelete: () => void;
  onTogglePin: () => void;
  pinning: boolean;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = a.body.length > 220;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {a.isPinned ? (
                <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-700">
                  <Pin className="h-3 w-3" />
                  Pinned
                </Badge>
              ) : null}
              <Badge variant="secondary" className={roleTone(a.targetRole)}>
                {roleLabel(a.targetRole)}
              </Badge>
              {a.scheduledAt ? (
                <Badge variant="outline" className="text-[10px]">
                  Scheduled
                </Badge>
              ) : null}
            </div>
            <h3 className="mt-1.5 text-base font-semibold">{a.title}</h3>
            <p
              className={cn(
                'mt-1 text-sm text-muted-foreground',
                !expanded && long ? 'line-clamp-2' : '',
              )}
            >
              {a.body}
            </p>
            {long ? (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? 'Show less' : 'Show more'}
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={a.author.avatarUrl ?? undefined} alt={a.author.fullname} />
              <AvatarFallback className="text-[10px]">
                {a.author.fullname
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>
              {a.author.fullname} · {timeAgo(a.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onTogglePin}
              disabled={pinning}
              className={cn(
                'grid h-7 w-7 place-items-center rounded-md transition hover:bg-muted disabled:opacity-50',
                a.isPinned ? 'text-amber-600' : 'text-muted-foreground',
              )}
              aria-label={a.isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
