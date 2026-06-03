'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Download, Search, X } from 'lucide-react';

import { AdminShell } from '@/components/layout/admin-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DataTable, type Column, type PaginationState } from '@/components/ui/data-table';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; fullname: string; email: string; role: string } | null;
  metadata: Record<string, unknown> | null;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_TONE: Record<string, string> = {
  CREATE: 'bg-emerald-500/10 text-emerald-700',
  UPDATE: 'bg-amber-500/10 text-amber-700',
  DELETE: 'bg-rose-500/10 text-rose-700',
  SUSPEND: 'bg-rose-500/10 text-rose-700',
  DEACTIVATE: 'bg-rose-500/10 text-rose-700',
  LOGIN: 'bg-blue-500/10 text-blue-700',
  PUBLISH: 'bg-emerald-500/10 text-emerald-700',
  PASSWORD_CHANGE: 'bg-blue-500/10 text-blue-700',
};

const ACTION_GROUPS: Array<{ label: string; actions: string[] }> = [
  { label: 'Logins', actions: ['LOGIN', 'LOGOUT', 'REGISTER'] },
  { label: 'Create events', actions: ['CREATE', 'PUBLISH', 'ANNOUNCEMENT_CREATE', 'COURSE_CREATE', 'RESOURCE_CREATE', 'DEPARTMENT_CREATE', 'SESSION_CREATE', 'USER_CREATE'] },
  { label: 'Updates', actions: ['UPDATE', 'ANNOUNCEMENT_UPDATE', 'COURSE_UPDATE', 'SESSION_SET_CURRENT', 'PASSWORD_CHANGE'] },
  { label: 'Destructive', actions: ['DELETE', 'DEACTIVATE', 'SUSPEND', 'USER_DEACTIVATE', 'COURSE_DELETE', 'DEPARTMENT_DELETE', 'ANNOUNCEMENT_DELETE', 'RESOURCE_DELETE'] },
];

const ACTION_OPTIONS = [
  'LOGIN', 'LOGOUT', 'PUBLISH',
  'USER_CREATE', 'USER_UPDATE', 'USER_DEACTIVATE',
  'COURSE_CREATE', 'COURSE_UPDATE', 'COURSE_DELETE', 'COURSE_ASSIGN',
  'ANNOUNCEMENT_CREATE', 'ANNOUNCEMENT_UPDATE', 'ANNOUNCEMENT_DELETE',
  'RESOURCE_CREATE', 'RESOURCE_DELETE', 'RESOURCE_DOWNLOAD',
  'DEPARTMENT_CREATE', 'DEPARTMENT_UPDATE', 'DEPARTMENT_DELETE',
  'SESSION_CREATE', 'SESSION_SET_CURRENT',
  'RESULT_UPLOAD', 'RESULT_PUBLISH', 'RESULT_UPLOAD_CSV',
  'PASSWORD_CHANGE',
];

function initials(n: string): string {
  return n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function timeAgo(d: string): string {
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d2 = Math.floor(h / 24);
  return `${d2}d ago`;
}

function rowToneClass(action: string): string {
  if (action.includes('DELETE') || action.includes('DEACTIVATE')) return 'border-l-2 border-l-rose-500/50';
  if (action.includes('UPDATE') || action.includes('SET_CURRENT')) return 'border-l-2 border-l-amber-500/50';
  if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'border-l-2 border-l-blue-500/50';
  if (action.includes('CREATE') || action.includes('PUBLISH')) return 'border-l-2 border-l-emerald-500/50';
  return '';
}

export default function AdminLogsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const logsQuery = useQuery({
    queryKey: ['audit', 'logs', { debouncedSearch, actionFilter, startDate, endDate, page }],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: '30',
      };
      if (debouncedSearch) params.userId = debouncedSearch;
      if (actionFilter !== 'ALL') params.action = actionFilter;
      if (startDate) params.startDate = new Date(startDate).toISOString();
      if (endDate) params.endDate = new Date(endDate).toISOString();
      return api.get<PaginatedResponse<AuditLog>>('/analytics/audit-logs', params);
    },
  });

  const todayQuery = useQuery({
    queryKey: ['audit', 'today'],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return api.get<PaginatedResponse<AuditLog>>('/analytics/audit-logs', {
        startDate: start.toISOString(),
        limit: '1',
      });
    },
  });

  const loginCountQuery = useQuery({
    queryKey: ['audit', 'loginCount'],
    queryFn: async () => {
      const data = await api.get<PaginatedResponse<AuditLog>>('/analytics/audit-logs', {
        action: 'LOGIN',
        limit: '1',
      });
      return data.total;
    },
  });

  const adminCountQuery = useQuery({
    queryKey: ['audit', 'adminCount'],
    queryFn: async () => {
      const data = await api.get<PaginatedResponse<AuditLog>>('/analytics/audit-logs', {
        userId: 'admin',
        limit: '1',
      });
      return data.total;
    },
  });

  const toggleExpanded = (id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns: Column<AuditLog>[] = useMemo(
    () => [
      {
        key: 'when',
        header: 'When',
        cell: (l) => (
          <div className="text-xs">
            <p className="font-mono">{new Date(l.createdAt).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{timeAgo(l.createdAt)}</p>
          </div>
        ),
      },
      {
        key: 'user',
        header: 'User',
        cell: (l) =>
          l.user ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">{initials(l.user.fullname)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{l.user.fullname}</p>
                <p className="truncate text-[10px] text-muted-foreground">{l.user.role}</p>
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">System</span>
          ),
      },
      {
        key: 'action',
        header: 'Action',
        cell: (l) => {
          const verb = l.action.split('_')[0];
          return (
            <Badge variant="secondary" className={cn('font-mono text-[10px]', ACTION_TONE[verb] ?? 'bg-muted text-muted-foreground')}>
              {l.action}
            </Badge>
          );
        },
      },
      {
        key: 'entity',
        header: 'Entity',
        cell: (l) => (
          <span className="font-mono text-xs text-muted-foreground">
            {l.entity ?? '—'}
            {l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ''}
          </span>
        ),
      },
      {
        key: 'ip',
        header: 'IP',
        cell: (l) => (
          <span className="font-mono text-[10px] text-muted-foreground">
            {l.ipAddress ?? '—'}
          </span>
        ),
      },
      {
        key: 'details',
        header: '',
        className: 'w-10 text-right',
        cell: (l) =>
          l.metadata ? (
            <button
              type="button"
              aria-label={expanded.has(l.id) ? 'Collapse details' : 'Expand details'}
              aria-expanded={expanded.has(l.id)}
              onClick={() => toggleExpanded(l.id)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {expanded.has(l.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : null,
      },
    ],
    [expanded],
  );

  function downloadCsv() {
    if (!logsQuery.data?.data.length) {
      toast.error('No logs to export');
      return;
    }
    const rows = logsQuery.data.data;
    const header = ['timestamp', 'user', 'email', 'role', 'action', 'entity', 'entityId', 'ipAddress', 'metadata'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const cells = [
        new Date(r.createdAt).toISOString(),
        r.user?.fullname ?? 'System',
        r.user?.email ?? '',
        r.user?.role ?? '',
        r.action,
        r.entity ?? '',
        r.entityId ?? '',
        r.ipAddress ?? '',
        r.metadata ? JSON.stringify(r.metadata).replace(/"/g, '""') : '',
      ];
      lines.push(cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} log${rows.length === 1 ? '' : 's'}`);
  }

  const rows = logsQuery.data?.data ?? [];

  return (
    <AdminShell>
      <PageHeader
        title="Audit logs"
        subtitle="Immutable record of administrative actions and system events."
        actions={
          <Button variant="outline" onClick={downloadCsv} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total today" value={todayQuery.data?.total ?? '—'} icon={Search} />
        <StatCard label="Login events" value={loginCountQuery.data ?? '—'} icon={Search} description="all time" />
        <StatCard label="Admin actions" value={adminCountQuery.data ?? '—'} icon={Search} description="all time" />
        <StatCard label="Filter result" value={logsQuery.data?.total ?? '—'} icon={Search} description="current view" />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Filters</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by user ID…"
                className="h-9 w-48 pl-8 text-sm"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All actions</SelectItem>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="h-9 w-36"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="h-9 w-36"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            isLoading={logsQuery.isLoading}
            rowKey={(r) => r.id}
            rowClassName={(r) => cn('hover:bg-muted/30', rowToneClass(r.action))}
            pagination={
              logsQuery.data
                ? {
                    page: logsQuery.data.page,
                    limit: logsQuery.data.limit,
                    total: logsQuery.data.total,
                    totalPages: logsQuery.data.totalPages,
                  }
                : undefined
            }
            onPageChange={setPage}
            emptyState={{ title: 'No logs match', description: 'Try clearing the filters.' }}
          />
        </CardContent>
      </Card>

      {rows.some((r) => expanded.has(r.id) && r.metadata) ? (
        <Card className="mt-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Expanded details</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(new Set())}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Collapse all
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows
              .filter((r) => expanded.has(r.id) && r.metadata)
              .map((l) => (
                <div key={l.id} className="rounded-lg border bg-muted/20 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold">{l.action}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      {l.user?.fullname ?? 'System'} ·{' '}
                      {new Date(l.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <pre className="overflow-x-auto rounded bg-background/40 p-2 text-[10px]">
                    {JSON.stringify(l.metadata, null, 2)}
                  </pre>
                  {l.userAgent ? (
                    <p className="mt-2 text-[10px] text-muted-foreground">UA: {l.userAgent}</p>
                  ) : null}
                </div>
              ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        <span className="font-semibold">Row colors:</span>
        <span className="border-l-2 border-l-rose-500/50 pl-1">DELETE / SUSPEND</span>
        <span className="border-l-2 border-l-amber-500/50 pl-1">UPDATE</span>
        <span className="border-l-2 border-l-blue-500/50 pl-1">LOGIN</span>
        <span className="border-l-2 border-l-emerald-500/50 pl-1">CREATE / PUBLISH</span>
        {ACTION_GROUPS.map((g) => (
          <span key={g.label}>· {g.label}</span>
        ))}
      </div>
    </AdminShell>
  );
}
