'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Check,
  Loader2,
  Pencil,
  Plus,
  Star,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/layout/admin-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';

interface Session {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
}

interface SessionForm {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export default function AdminSessionsPage() {
  const qc = useQueryClient();
  const sessionsQuery = useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: async () => api.get<Session[]>('/sessions'),
  });

  const sessions = sessionsQuery.data ?? [];
  const current = sessions.find((s) => s.isCurrent);
  const ordered = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      return b.name.localeCompare(a.name);
    });
  }, [sessions]);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<SessionForm>({
    defaultValues: { name: '', startDate: '', endDate: '', isCurrent: false },
  });

  const isCurrent = watch('isCurrent');

  const createMutation = useMutation({
    mutationFn: async (input: SessionForm) =>
      api.post<Session>('/sessions', {
        name: input.name,
        startDate: new Date(input.startDate).toISOString(),
        endDate: new Date(input.endDate).toISOString(),
        isCurrent: input.isCurrent,
      }),
    onSuccess: (created) => {
      toast.success(`Session ${created.name} created`);
      reset();
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Create failed'),
  });

  const setCurrentMutation = useMutation({
    mutationFn: async (id: string) =>
      api.patch<{ message: string }>(`/sessions/${id}/set-current`, {}),
    onSuccess: () => {
      toast.success('Current session updated');
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  function onSubmit(values: SessionForm) {
    createMutation.mutate(values);
  }

  return (
    <AdminShell>
      <PageHeader
        title="Session management"
        subtitle="Create academic sessions and toggle which one is currently active."
      />

      <div className="mt-6 space-y-4">
        {current ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Current session</p>
                  <p className="text-lg font-semibold">{current.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(current.startDate).toLocaleDateString()} → {new Date(current.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary">Active</Badge>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create session</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="session-name">Session name</Label>
                <Input
                  id="session-name"
                  placeholder="2025/2026"
                  {...register('name', {
                    required: 'Required',
                    pattern: { value: /^\d{4}\/\d{4}$/, message: 'Use YYYY/YYYY' },
                  })}
                />
                {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date">Start date</Label>
                  <Input id="start-date" type="date" {...register('startDate', { required: 'Required' })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-date">End date</Label>
                  <Input id="end-date" type="date" {...register('endDate', { required: 'Required' })} />
                </div>
              </div>
              <label className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <Checkbox
                  checked={isCurrent}
                  onCheckedChange={(c) => setValue('isCurrent', Boolean(c))}
                />
                <span className="text-sm">Set as current session</span>
              </label>
              <div className="col-span-2 flex justify-end">
                <Button type="submit" disabled={createMutation.isPending} className="gap-1.5">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create session
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sessionsQuery.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : ordered.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No sessions yet"
                description="Create the first session above."
                className="m-6"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Session</th>
                      <th className="px-3 py-2 font-medium">Dates</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ordered.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{s.name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {new Date(s.startDate).toLocaleDateString()} → {new Date(s.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">
                          {s.isCurrent ? (
                            <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
                              <Check className="h-3 w-3" />
                              Current
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {!s.isCurrent ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentMutation.mutate(s.id)}
                              disabled={setCurrentMutation.isPending}
                              className="gap-1.5"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Set current
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          <X className="mr-1 inline h-3 w-3" />
          Only one session can be active at a time. Setting a new one demotes the previous current.
        </p>
      </div>
    </AdminShell>
  );
}

