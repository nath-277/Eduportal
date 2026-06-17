'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Plus,
  MessageSquare,
  Calendar,
  User,
  Tag,
  Filter,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/layout/admin-shell';
import { LecturerShell } from '@/components/layout/lecturer-shell';
import { StudentShell } from '@/components/layout/student-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TicketCategory = 'REGISTRATION' | 'RESULTS' | 'BUG' | 'OTHER';

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  createdAt: string;
  user: {
    id: string;
    fullname: string;
    email: string;
    role: string;
    matricNumber?: string;
  };
  _count: {
    comments: number;
  };
}

interface TicketsResponse {
  tickets: SupportTicket[];
}

export default function SupportDashboardPage() {
  const { user, role, isAuthenticated, isLoading } = useAuthGuard();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Filters for Admin
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('OTHER');
  const [priority, setPriority] = useState<TicketPriority>('LOW');

  const qc = useQueryClient();

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filterStatus !== 'all') params.status = filterStatus;
    if (filterPriority !== 'all') params.priority = filterPriority;
    if (filterCategory !== 'all') params.category = filterCategory;
    return params;
  }, [filterStatus, filterPriority, filterCategory]);

  const ticketsQuery = useQuery({
    queryKey: ['support', 'tickets', role, queryParams],
    queryFn: async () => api.get<TicketsResponse>('/support/tickets', queryParams),
    enabled: isAuthenticated && !!role,
  });

  const createTicket = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      category: TicketCategory;
      priority: TicketPriority;
      metadata: Record<string, unknown>;
    }) => api.post<{ ticket: SupportTicket }>('/support/tickets', data),
    onSuccess: () => {
      toast.success('Support ticket created successfully');
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      setCategory('OTHER');
      setPriority('LOW');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create ticket');
    },
  });

  if (!isAuthenticated || isLoading || !user) {
    return null;
  }

  const Shell =
    role === 'ADMIN' ? AdminShell : role === 'LECTURER' ? LecturerShell : StudentShell;

  const tickets = ticketsQuery.data?.tickets ?? [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    // Capture basic client metadata
    const metadata = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      screenResolution:
        typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      pageUrl: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    createTicket.mutate({
      title,
      description,
      category,
      priority,
      metadata,
    });
  };

  return (
    <Shell>
      <PageHeader
        title="Support & Feedback"
        subtitle={
          role === 'ADMIN'
            ? 'Triage, manage, and resolve tickets and error reports submitted by users.'
            : 'Track issues, submit bug reports, and converse directly with administrators.'
        }
        actions={
          role !== 'ADMIN' ? (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg bg-card">
                <DialogHeader>
                  <DialogTitle>Create Support Ticket</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Title</label>
                    <Input
                      placeholder="Brief summary of the issue..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as TicketCategory)}
                        className="w-full h-9 rounded-md border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="REGISTRATION">Registration</option>
                        <option value="RESULTS">Results</option>
                        <option value="BUG">UI/System Bug</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as TicketPriority)}
                        className="w-full h-9 rounded-md border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Description</label>
                    <Textarea
                      placeholder="Detailed description of what went wrong, steps to reproduce, or feedback..."
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                      disabled={createTicket.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTicket.isPending} className="gap-2">
                      {createTicket.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Submit Ticket'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {role === 'ADMIN' ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 bg-muted/30 p-3 rounded-xl border border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 rounded-lg border bg-card px-2 text-xs focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <select
              aria-label="Priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="h-8 rounded-lg border bg-card px-2 text-xs focus:outline-none"
            >
              <option value="all">All priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            <select
              aria-label="Category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-8 rounded-lg border bg-card px-2 text-xs focus:outline-none"
            >
              <option value="all">All categories</option>
              <option value="REGISTRATION">Registration</option>
              <option value="RESULTS">Results</option>
              <option value="BUG">Bug</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        {ticketsQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="gap-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <Card>
            <EmptyState
              icon={CheckCircle2}
              title="All clear!"
              description={
                role === 'ADMIN'
                  ? 'No tickets match the selected filter criteria.'
                  : 'You have not created any support tickets yet. Click "New ticket" to log an issue.'
              }
              className="m-6"
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const statusColors = {
    OPEN: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    RESOLVED: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  }[ticket.status as TicketStatus];

  const priorityColors = {
    LOW: 'bg-slate-500/10 text-slate-700',
    MEDIUM: 'bg-orange-500/10 text-orange-700',
    HIGH: 'bg-red-500/10 text-red-700 dark:bg-red-500/25 dark:text-red-400',
  }[ticket.priority as TicketPriority];

  const categoryLabels = {
    REGISTRATION: 'Registration',
    RESULTS: 'Results',
    BUG: 'Bug Report',
    OTHER: 'General/Other',
  }[ticket.category as TicketCategory];

  return (
    <Card className="flex flex-col justify-between hover:shadow-md transition duration-200">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className={cn('text-[10px] uppercase font-mono px-2 py-0.5', statusColors)}>
            {ticket.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', priorityColors)}>
            {ticket.priority} priority
          </Badge>
        </div>
        <CardTitle className="text-base mt-2 line-clamp-1">{ticket.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between gap-4">
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {ticket.description}
        </p>

        <div className="border-t border-border/60 pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" />
              {categoryLabels}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(ticket.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate max-w-[120px]">{ticket.user.fullname}</span>
            </span>
            <Link
              href={`/support/tickets/${ticket.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <span>View thread</span>
              <MessageSquare className="h-3.5 w-3.5" />
              {ticket._count.comments > 0 ? (
                <span className="ml-0.5 bg-primary/10 px-1 rounded-sm text-[9px]">
                  {ticket._count.comments}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
