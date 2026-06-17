'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  GraduationCap,
  Landmark,
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
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  maxLevel: string;
  createdAt: string;
}

interface Programme {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  departmentId: string;
  department?: Department | null;
  createdAt: string;
}

interface DepartmentWithCounts extends Department {
  _count?: { users: number; courses: number };
}

interface ProgrammeForm {
  name: string;
  code: string;
  description: string;
  departmentId: string;
}

interface DeptForm {
  name: string;
  code: string;
  description: string;
  maxLevel: string;
}

export default function AdminDepartmentsPage() {
  return (
    <AdminShell>
      <PageHeader
        title="Academic Structure"
        subtitle="Manage the departments and programmes of study."
      />
      <div className="mt-6">
        <Tabs defaultValue="departments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="departments" className="gap-2">
              <Landmark className="h-4 w-4" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="programmes" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Programmes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="departments">
            <DepartmentsTab />
          </TabsContent>
          <TabsContent value="programmes">
            <ProgrammesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}

function DepartmentsTab() {
  const qc = useQueryClient();
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const deptsQuery = useQuery({
    queryKey: ['departments', 'admin'],
    queryFn: async () => {
      const depts = await api.get<Department[]>('/departments');
      const withCounts: DepartmentWithCounts[] = await Promise.all(
        depts.map(async (d) => {
          try {
            const users = await api.get<{ total: number }>('/users', { departmentId: d.id, limit: '1' });
            return { ...d, _count: { users: users.total, courses: 0 } };
          } catch {
            return { ...d, _count: { users: 0, courses: 0 } };
          }
        }),
      );
      return withCounts;
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DeptForm>({
    defaultValues: { name: '', code: '', description: '', maxLevel: 'L400' },
  });

  const createMutation = useMutation({
    mutationFn: async (input: DeptForm) =>
      api.post<Department>('/departments', {
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description || undefined,
        maxLevel: input.maxLevel,
      }),
    onSuccess: () => {
      toast.success('Department created');
      reset();
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Create failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete<{ message: string }>(`/departments/${id}`),
    onSuccess: () => {
      toast.success('Department deleted');
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add department</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((v) => createMutation.mutate(v))}
            className="grid gap-3 sm:grid-cols-[1fr_150px_180px_auto] sm:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">Name</Label>
              <Input id="dept-name" placeholder="e.g. Computer Science" {...register('name', { required: 'Required', minLength: { value: 2, message: 'At least 2 chars' } })} />
              {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-code">Code</Label>
              <Input id="dept-code" placeholder="CSC" maxLength={5} {...register('code', { required: 'Required', pattern: { value: /^[A-Z]{2,5}$/i, message: '2-5 letters' } })} />
              {errors.code ? <p className="text-xs text-destructive">{errors.code.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-maxlevel">Graduation Level</Label>
              <select
                id="dept-maxlevel"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...register('maxLevel', { required: 'Required' })}
              >
                <option value="L300">3 Years (L300)</option>
                <option value="L400">4 Years (L400)</option>
                <option value="L500">5 Years (L500)</option>
              </select>
            </div>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending} className="gap-1.5">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All departments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {deptsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !deptsQuery.data || deptsQuery.data.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No departments yet"
              description="Create your first department above."
              className="m-6"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 text-right font-medium">Graduation Level</th>
                    <th className="px-3 py-2 text-right font-medium">Users</th>
                    <th className="px-3 py-2 text-right font-medium">Created</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deptsQuery.data.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{d.name}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="font-mono">{d.code}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Badge variant="outline" className="font-mono">{d.maxLevel}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{d._count?.users ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            aria-label="Edit"
                            onClick={() => setEditingDept(d)}
                            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete"
                            onClick={() => {
                              if (confirm(`Delete department "${d.name}"?`)) deleteMutation.mutate(d.id);
                            }}
                            disabled={deleteMutation.isPending}
                            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editingDept && (
        <EditDepartmentDialog
          department={editingDept}
          onClose={() => setEditingDept(null)}
        />
      )}
    </div>
  );
}

function EditDepartmentDialog({
  department,
  onClose,
}: {
  department: Department;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<DeptForm>({
    defaultValues: {
      name: department.name,
      code: department.code,
      description: department.description || '',
      maxLevel: department.maxLevel,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: DeptForm) =>
      api.patch<{ department: Department }>(`/departments/${department.id}`, {
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description || null,
        maxLevel: input.maxLevel,
      }),
    onSuccess: () => {
      toast.success('Department updated successfully');
      qc.invalidateQueries({ queryKey: ['departments'] });
      onClose();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit department</DialogTitle>
          <DialogDescription>
            Modify details for department {department.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-dept-name">Name</Label>
            <Input
              id="edit-dept-name"
              {...register('name', {
                required: 'Required',
                minLength: { value: 2, message: 'At least 2 chars' },
              })}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-dept-code">Code</Label>
            <Input
              id="edit-dept-code"
              maxLength={5}
              {...register('code', {
                required: 'Required',
                pattern: { value: /^[A-Z]{2,5}$/i, message: '2-5 letters' },
              })}
            />
            {errors.code ? <p className="text-xs text-destructive">{errors.code.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-dept-maxlevel">Graduation Level</Label>
            <select
              id="edit-dept-maxlevel"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('maxLevel', { required: 'Required' })}
            >
              <option value="L300">3 Years (L300)</option>
              <option value="L400">4 Years (L400)</option>
              <option value="L500">5 Years (L500)</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProgrammesTab() {
  const qc = useQueryClient();
  const [editingProg, setEditingProg] = useState<Programme | null>(null);

  const deptsQuery = useQuery({
    queryKey: ['departments', 'list-all'],
    queryFn: async () => api.get<Department[]>('/departments'),
  });

  const programmesQuery = useQuery({
    queryKey: ['programmes', 'admin'],
    queryFn: async () => {
      const progs = await api.get<Programme[]>('/programmes');
      const withCounts: Array<Programme & { _count?: { users: number } }> = await Promise.all(
        progs.map(async (p) => {
          try {
            const users = await api.get<{ total: number }>('/users', { programmeId: p.id, limit: '1' });
            return { ...p, _count: { users: users.total } };
          } catch {
            return { ...p, _count: { users: 0 } };
          }
        }),
      );
      return withCounts;
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProgrammeForm>({
    defaultValues: { name: '', code: '', description: '', departmentId: '' },
  });

  const createMutation = useMutation({
    mutationFn: async (input: ProgrammeForm) =>
      api.post<Programme>('/programmes', {
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description || undefined,
        departmentId: input.departmentId,
      }),
    onSuccess: () => {
      toast.success('Programme created');
      reset();
      qc.invalidateQueries({ queryKey: ['programmes'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Create failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete<{ message: string }>(`/programmes/${id}`),
    onSuccess: () => {
      toast.success('Programme deleted');
      qc.invalidateQueries({ queryKey: ['programmes'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add academic programme</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((v) => createMutation.mutate(v))}
            className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="prog-name">Name</Label>
              <Input
                id="prog-name"
                placeholder="e.g. Software Engineering"
                {...register('name', {
                  required: 'Required',
                  minLength: { value: 2, message: 'At least 2 chars' },
                })}
              />
              {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prog-code">Code</Label>
              <Input
                id="prog-code"
                placeholder="SEN"
                maxLength={5}
                {...register('code', {
                  required: 'Required',
                  pattern: { value: /^[A-Z]{2,5}$/i, message: '2-5 letters' },
                })}
              />
              {errors.code ? <p className="text-xs text-destructive">{errors.code.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prog-dept">Department</Label>
              <select
                id="prog-dept"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...register('departmentId', { required: 'Required' })}
              >
                <option value="">Select Department</option>
                {(deptsQuery.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
              {errors.departmentId ? <p className="text-xs text-destructive">{errors.departmentId.message}</p> : null}
            </div>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending} className="gap-1.5">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All programmes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {programmesQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !programmesQuery.data || programmesQuery.data.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="No programmes yet"
              description="Create your first programme above."
              className="m-6"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Department</th>
                    <th className="px-3 py-2 text-right font-medium">Students</th>
                    <th className="px-3 py-2 text-right font-medium">Created</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {programmesQuery.data.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="font-mono">{p.code}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.department?.name || '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{p._count?.users ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            aria-label="Edit"
                            onClick={() => setEditingProg(p)}
                            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete"
                            onClick={() => {
                              if (confirm(`Delete programme "${p.name}"?`)) deleteMutation.mutate(p.id);
                            }}
                            disabled={deleteMutation.isPending}
                            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editingProg && (
        <EditProgrammeDialog
          programme={editingProg}
          departments={deptsQuery.data ?? []}
          onClose={() => setEditingProg(null)}
        />
      )}
    </div>
  );
}

function EditProgrammeDialog({
  programme,
  departments,
  onClose,
}: {
  programme: Programme;
  departments: Department[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<ProgrammeForm>({
    defaultValues: {
      name: programme.name,
      code: programme.code,
      description: programme.description || '',
      departmentId: programme.departmentId,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: ProgrammeForm) =>
      api.patch<{ programme: Programme }>(`/programmes/${programme.id}`, {
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description || null,
        departmentId: input.departmentId,
      }),
    onSuccess: () => {
      toast.success('Programme updated successfully');
      qc.invalidateQueries({ queryKey: ['programmes'] });
      onClose();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit programme</DialogTitle>
          <DialogDescription>
            Modify details for programme {programme.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-prog-name">Name</Label>
            <Input
              id="edit-prog-name"
              {...register('name', {
                required: 'Required',
                minLength: { value: 2, message: 'At least 2 chars' },
              })}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-prog-code">Code</Label>
            <Input
              id="edit-prog-code"
              maxLength={5}
              {...register('code', {
                required: 'Required',
                pattern: { value: /^[A-Z]{2,5}$/i, message: '2-5 letters' },
              })}
            />
            {errors.code ? <p className="text-xs text-destructive">{errors.code.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-prog-dept">Department</Label>
            <select
              id="edit-prog-dept"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('departmentId', { required: 'Required' })}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
