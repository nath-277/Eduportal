'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  UserPlus,
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
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, type Column, type PaginationState } from '@/components/ui/data-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Level, UserRole } from '@eduportal/shared';

interface User {
  id: string;
  fullname: string;
  email: string;
  matricNumber?: string | null;
  staffId?: string | null;
  role: UserRole;
  level?: Level | null;
  semester?: 'FIRST' | 'SECOND' | null;
  avatarUrl?: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  departmentId?: string | null;
  department?: { id: string; name: string; code: string } | null;
  programmeId?: string | null;
  programme?: { id: string; name: string; code: string } | null;
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Programme {
  id: string;
  name: string;
  code: string;
  departmentId: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface EditForm {
  fullname: string;
  role: UserRole;
  level: Level | 'NONE';
  departmentId: string;
  programmeId: string;
  isActive: boolean;
}

interface AddForm {
  fullname: string;
  email: string;
  password: string;
  role: UserRole;
  matricNumber: string;
  staffId: string;
  level: Level | '';
  departmentId: string;
  programmeId: string;
}

const ROLES: Array<{ value: UserRole; label: string; tone: string }> = [
  { value: 'STUDENT', label: 'Student', tone: 'bg-blue-500/10 text-blue-700' },
  { value: 'LECTURER', label: 'Lecturer', tone: 'bg-emerald-500/10 text-emerald-700' },
  { value: 'ADMIN', label: 'Admin', tone: 'bg-purple-500/10 text-purple-700' },
];

const LEVELS: Level[] = ['L100', 'L200', 'L300', 'L400', 'L500'];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function roleTone(r: UserRole): string {
  return ROLES.find((x) => x.value === r)?.tone ?? 'bg-muted text-muted-foreground';
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [levelFilter, setLevelFilter] = useState<Level | 'ALL'>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<User | null>(null);
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<User | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<User | null>(null);

  useState(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'admin', { debouncedSearch, roleFilter, levelFilter, deptFilter, page }],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: '20',
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (levelFilter !== 'ALL') params.level = levelFilter;
      if (deptFilter !== 'ALL') params.departmentId = deptFilter;
      return api.get<PaginatedResponse<User>>('/users', params);
    },
  });

  const statsQuery = useQuery({
    queryKey: ['analytics', 'admin', 'header'],
    queryFn: async () => {
      const [students, lecturers, admins, total] = await Promise.all([
        api.get<PaginatedResponse<User>>('/users', { role: 'STUDENT', limit: '1' }),
        api.get<PaginatedResponse<User>>('/users', { role: 'LECTURER', limit: '1' }),
        api.get<PaginatedResponse<User>>('/users', { role: 'ADMIN', limit: '1' }),
        api.get<PaginatedResponse<User>>('/users', { limit: '1' }),
      ]);
      return {
        students: students.total,
        lecturers: lecturers.total,
        admins: admins.total,
        total: total.total,
      };
    },
  });

  const deptsQuery = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => api.get<Department[]>('/departments'),
  });

  const toggleMutation = useMutation({
    mutationFn: async (u: User) =>
      api.delete<{ user: User }>(`/users/${u.id}`),
    onSuccess: (data) => {
      toast.success(data.user.isActive ? 'User reactivated' : 'User suspended');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'admin'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  const columns: Column<User>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'User',
        cell: (u) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.fullname} /> : null}
              <AvatarFallback className="text-[10px]">{initials(u.fullname)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{u.fullname}</p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'id',
        header: 'Matric / Staff',
        cell: (u) => (
          <span className="font-mono text-xs">
            {u.matricNumber ?? u.staffId ?? <span className="text-muted-foreground">—</span>}
          </span>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        cell: (u) => (
          <Badge variant="secondary" className={cn('font-medium', roleTone(u.role))}>
            {u.role}
          </Badge>
        ),
      },
      {
        key: 'level',
        header: 'Level',
        cell: (u) => (u.level ? <Badge variant="outline">{u.level}</Badge> : <span className="text-xs text-muted-foreground">—</span>),
      },
      {
        key: 'department',
        header: 'Department',
        cell: (u) => (
          <span className="text-xs">
            {u.department?.code ?? <span className="text-muted-foreground">—</span>}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (u) => (
          <Badge
            variant="secondary"
            className={cn(
              u.isActive
                ? 'bg-emerald-500/10 text-emerald-700'
                : 'bg-rose-500/10 text-rose-700',
            )}
          >
            {u.isActive ? 'Active' : 'Suspended'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: '',
        className: 'text-right',
        cell: (u) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              aria-label="View profile"
              onClick={() => setViewing(u)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Edit"
              onClick={() => setEditing(u)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Reset password"
              onClick={() => setResettingPasswordUser(u)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={u.isActive ? 'Suspend' : 'Reactivate'}
              onClick={() => {
                if (confirm(`${u.isActive ? 'Suspend' : 'Reactivate'} ${u.fullname}?`)) {
                  toggleMutation.mutate(u);
                }
              }}
              disabled={toggleMutation.isPending}
              className={cn(
                'grid h-7 w-7 place-items-center rounded-md transition disabled:opacity-50',
                u.isActive
                  ? 'text-rose-600 hover:bg-rose-500/10'
                  : 'text-emerald-600 hover:bg-emerald-500/10',
              )}
            >
              {u.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
            </button>
          </div>
        ),
      },
    ],
    [toggleMutation],
  );

  const pagination: PaginationState | undefined = usersQuery.data
    ? {
        page: usersQuery.data.page,
        limit: usersQuery.data.limit,
        total: usersQuery.data.total,
        totalPages: usersQuery.data.totalPages,
      }
    : undefined;

  return (
    <AdminShell>
      <PageHeader
        title="User management"
        subtitle="Manage students, lecturers, and administrators across the department."
        actions={
          <Button onClick={() => setAdding(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Add user
          </Button>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={statsQuery.data?.total ?? '—'} icon={UserPlus} />
        <StatCard label="Students" value={statsQuery.data?.students ?? '—'} icon={UserPlus} />
        <StatCard label="Lecturers" value={statsQuery.data?.lecturers ?? '—'} icon={UserPlus} />
        <StatCard label="Admins" value={statsQuery.data?.admins ?? '—'} icon={UserPlus} />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Users</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, matric…"
                className="h-9 w-44 pl-8 text-sm sm:w-60"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as UserRole | 'ALL'); setPage(1); }}>
              <SelectTrigger className="h-9 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v as Level | 'ALL'); setPage(1); }}>
              <SelectTrigger className="h-9 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All levels</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All departments</SelectItem>
                {deptsQuery.data?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !usersQuery.data || usersQuery.data.data.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No users match"
              description="Try clearing the search or filters, or invite a new user."
              className="m-6"
            />
          ) : (
            <DataTable
              columns={columns}
              data={usersQuery.data.data}
              rowKey={(u) => u.id}
              pagination={pagination}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {editing ? (
        <EditUserDialog
          user={editing}
          departments={deptsQuery.data ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {adding ? (
        <AddUserDialog
          departments={deptsQuery.data ?? []}
          onClose={() => setAdding(false)}
        />
      ) : null}

      {viewing ? (
        <ViewUserDialog user={viewing} onClose={() => setViewing(null)} />
      ) : null}

      {resettingPasswordUser ? (
        <ResetPasswordDialog
          user={resettingPasswordUser}
          onClose={() => setResettingPasswordUser(null)}
        />
      ) : null}
    </AdminShell>
  );
}

function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

  function generatePassword() {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+';
    const all = uppercase + lowercase + numbers + special;

    let res = '';
    res += uppercase[Math.floor(Math.random() * uppercase.length)];
    res += lowercase[Math.floor(Math.random() * lowercase.length)];
    res += numbers[Math.floor(Math.random() * numbers.length)];
    res += special[Math.floor(Math.random() * special.length)];

    for (let i = 0; i < 8; i++) {
      res += all[Math.floor(Math.random() * all.length)];
    }
    setPassword(res);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/users/${user.id}/reset-password`, { password });
      toast.success("User's password reset successfully");
      setSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success('Password copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Reset password for <span className="font-semibold text-foreground">{user.fullname}</span> ({user.email}).
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300">
              Password has been updated successfully. Please copy the new password and share it with the user securely.
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
              <span className="flex-1 select-all font-mono text-sm">{password}</span>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <div className="flex gap-2">
                <Input
                  id="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter custom password"
                  className="font-mono text-sm"
                  required
                />
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Generate
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Must be at least 8 characters and contain 1 uppercase letter, 1 lowercase letter, and 1 number.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !password}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Reset password
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  departments,
  onClose,
}: {
  user: User;
  departments: Department[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<EditForm>({
    defaultValues: {
      fullname: user.fullname,
      role: user.role,
      level: user.level ?? 'NONE',
      departmentId: user.departmentId ?? 'NONE',
      programmeId: user.programmeId ?? 'NONE',
      isActive: user.isActive,
    },
  });

  const role = watch('role');
  const isActive = watch('isActive');
  const departmentId = watch('departmentId');
  const programmeId = watch('programmeId');

  const programmesQuery = useQuery({
    queryKey: ['programmes', 'by-department', departmentId],
    queryFn: async () => {
      if (!departmentId || departmentId === 'NONE') return [];
      return api.get<Programme[]>(`/departments/${departmentId}/programmes`);
    },
    enabled: departmentId !== 'NONE',
  });

  const updateMutation = useMutation({
    mutationFn: async (input: EditForm) => {
      const payload: Record<string, unknown> = {
        fullname: input.fullname,
        role: input.role,
        isActive: input.isActive,
      };
      if (input.role === 'STUDENT' && input.level !== 'NONE') payload.level = input.level;
      else if (input.role === 'STUDENT') payload.level = null;
      if (input.departmentId !== 'NONE') payload.departmentId = input.departmentId;
      else payload.departmentId = null;

      if (input.role === 'STUDENT' && input.programmeId !== 'NONE') payload.programmeId = input.programmeId;
      else payload.programmeId = null;

      return api.patch<{ user: User }>(`/users/${user.id}`, payload);
    },
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  });

  function onSubmit(values: EditForm) {
    updateMutation.mutate(values);
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update {user.fullname}&apos;s profile, role, and department.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullname">Full name</Label>
            <Input id="fullname" {...register('fullname', { required: 'Required' })} />
            {errors.fullname ? <p className="text-xs text-destructive">{errors.fullname.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setValue('role', v as UserRole, { shouldDirty: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {role === 'STUDENT' ? (
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select value={watch('level')} onValueChange={(v) => setValue('level', v as Level, { shouldDirty: true })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">—</SelectItem>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select
              value={departmentId}
              onValueChange={(v) => {
                setValue('departmentId', v, { shouldDirty: true });
                setValue('programmeId', 'NONE', { shouldDirty: true });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">— None —</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {role === 'STUDENT' && departmentId !== 'NONE' && (
            <div className="space-y-1.5">
              <Label>Programme</Label>
              <Select
                value={programmeId}
                onValueChange={(v) => setValue('programmeId', v, { shouldDirty: true })}
                disabled={programmesQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      programmesQuery.isLoading ? 'Loading programmes…' : 'Select programme'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {(programmesQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <label className="flex items-center gap-2">
            <Checkbox
              checked={isActive}
              onCheckedChange={(c) => setValue('isActive', Boolean(c), { shouldDirty: true })}
            />
            <span className="text-sm">Active (uncheck to suspend)</span>
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddUserDialog({
  departments,
  onClose,
}: {
  departments: Department[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AddForm>({
    defaultValues: {
      fullname: '',
      email: '',
      password: '',
      role: 'STUDENT',
      matricNumber: '',
      staffId: '',
      level: '',
      departmentId: '',
      programmeId: '',
    },
  });

  const role = watch('role');
  const departmentId = watch('departmentId');
  const programmeId = watch('programmeId');

  const programmesQuery = useQuery({
    queryKey: ['programmes', 'by-department', departmentId],
    queryFn: async () => {
      if (!departmentId) return [];
      return api.get<Programme[]>(`/departments/${departmentId}/programmes`);
    },
    enabled: !!departmentId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: AddForm) => {
      const payload: Record<string, unknown> = {
        fullname: input.fullname,
        email: input.email,
        password: input.password,
        role: input.role,
        departmentId: input.departmentId,
      };
      if (input.role === 'STUDENT' && input.matricNumber) payload.matricNumber = input.matricNumber;
      if (input.role === 'LECTURER' && input.staffId) payload.staffId = input.staffId;
      if (input.role === 'STUDENT' && input.level) payload.level = input.level;

      if (input.role === 'STUDENT' && input.programmeId) payload.programmeId = input.programmeId;

      return api.post<{ user: User }>('/auth/register', payload);
    },
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'admin'] });
      onClose();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Create failed'),
  });

  function onSubmit(values: AddForm) {
    createMutation.mutate(values);
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create a new account. The user will receive a verification email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fullname">Full name</Label>
            <Input id="fullname" {...register('fullname', { required: 'Required', minLength: { value: 3, message: 'At least 3 chars' } })} />
            {errors.fullname ? <p className="text-xs text-destructive">{errors.fullname.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email', { required: 'Required' })} />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Initial password</Label>
            <Input id="password" type="password" placeholder="At least 8 chars, 1 uppercase, 1 number" {...register('password', { required: 'Required', minLength: { value: 8, message: 'At least 8 chars' } })} />
            {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setValue('role', v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{role === 'STUDENT' ? 'Matric number' : 'Staff ID'}</Label>
              {role === 'STUDENT' ? (
                <Input placeholder="e.g. CSC/2025/001" {...register('matricNumber')} />
              ) : (
                <Input placeholder="e.g. STF002" {...register('staffId')} />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {role === 'STUDENT' ? (
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select value={watch('level')} onValueChange={(v) => setValue('level', v as Level)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={departmentId}
                onValueChange={(v) => {
                  setValue('departmentId', v);
                  setValue('programmeId', '');
                }}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {role === 'STUDENT' && departmentId && (
            <div className="space-y-1.5">
              <Label>Programme</Label>
              <Select value={programmeId} onValueChange={(v) => setValue('programmeId', v)}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      programmesQuery.isLoading ? 'Loading programmes…' : 'Select programme'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(programmesQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="gap-1.5">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ViewUserDialog({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user.fullname}</DialogTitle>
          <DialogDescription>
            {user.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={cn(roleTone(user.role))}>
              {user.role}
            </Badge>
            {user.level ? <Badge variant="outline">{user.level}</Badge> : null}
            <Badge
              variant="secondary"
              className={cn(
                user.isActive
                  ? 'bg-emerald-500/10 text-emerald-700'
                  : 'bg-rose-500/10 text-rose-700',
              )}
            >
              {user.isActive ? 'Active' : 'Suspended'}
            </Badge>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Matric / Staff</dt>
            <dd className="font-mono text-xs">{user.matricNumber ?? user.staffId ?? '—'}</dd>
            <dt className="text-muted-foreground">Department</dt>
            <dd>{user.department ? `${user.department.code} — ${user.department.name}` : '—'}</dd>
            {user.role === 'STUDENT' && user.programme && (
              <>
                <dt className="text-muted-foreground">Programme</dt>
                <dd>{user.programme.code} — {user.programme.name}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Email verified</dt>
            <dd>{user.isEmailVerified ? 'Yes' : 'No'}</dd>
            <dt className="text-muted-foreground">Joined</dt>
            <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
          </dl>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
