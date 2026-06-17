'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  User,
  Cpu,
  MessageSquare,
  Send,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/layout/admin-shell';
import { LecturerShell } from '@/components/layout/lecturer-shell';
import { StudentShell } from '@/components/layout/student-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TicketCategory = 'REGISTRATION' | 'RESULTS' | 'BUG' | 'OTHER';

interface TicketComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    fullname: string;
    email: string;
    role: string;
  };
}

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    fullname: string;
    email: string;
    role: string;
    matricNumber?: string;
  };
  comments: TicketComment[];
}

interface TicketResponse {
  ticket: TicketDetail;
}

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const { role, isAuthenticated, isLoading } = useAuthGuard();
  const [commentText, setCommentText] = useState('');

  const qc = useQueryClient();

  const ticketQuery = useQuery({
    queryKey: ['support', 'ticket', id],
    queryFn: async () => api.get<TicketResponse>(`/support/tickets/${id}`),
    enabled: isAuthenticated && !!id,
  });

  const postComment = useMutation({
    mutationFn: async (content: string) =>
      api.post<{ comment: TicketComment }>(`/support/tickets/${id}/comments`, { content }),
    onSuccess: () => {
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['support', 'ticket', id] });
      toast.success('Reply posted');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to post reply');
    },
  });

  const updateTicket = useMutation({
    mutationFn: async (data: { status?: TicketStatus; priority?: TicketPriority }) =>
      api.patch<{ ticket: TicketDetail }>(`/support/tickets/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support', 'ticket', id] });
      toast.success('Ticket updated successfully');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update ticket');
    },
  });

  if (!isAuthenticated || isLoading || !role) {
    return null;
  }

  const Shell =
    role === 'ADMIN' ? AdminShell : role === 'LECTURER' ? LecturerShell : StudentShell;

  const ticket = ticketQuery.data?.ticket;

  const handlePostCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    postComment.mutate(commentText);
  };

  const handleStatusChange = (status: TicketStatus) => {
    updateTicket.mutate({ status });
  };

  const handlePriorityChange = (priority: TicketPriority) => {
    updateTicket.mutate({ priority });
  };

  const initials = (name: string) => {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  };

  const categoryLabels: Record<TicketCategory, string> = {
    REGISTRATION: 'Registration',
    RESULTS: 'Results',
    BUG: 'Bug Report',
    OTHER: 'General/Other',
  };

  return (
    <Shell>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/support')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </Button>
      </div>

      {ticketQuery.isLoading || !ticket ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-60 w-full" />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Discussion Thread */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-border">
              <CardHeader className="p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">{ticket.title}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {ticket.user.fullname} ({ticket.user.matricNumber || ticket.user.email})
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Opened on {new Date(ticket.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'px-2.5 py-0.5 text-xs font-mono uppercase',
                      {
                        OPEN: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
                        IN_PROGRESS: 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
                        RESOLVED: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
                      }[ticket.status as TicketStatus],
                    )}
                  >
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline" className="px-2.5 py-0.5 text-xs">
                    {ticket.priority} priority
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </CardContent>
            </Card>

            {/* Comment Thread Timeline */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
              <div className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Activity History
              </div>

              {ticket.comments.map((comment) => {
                const isAdminComment = comment.user.role === 'ADMIN';
                return (
                  <div key={comment.id} className="relative group flex gap-3">
                    {/* Timeline circle node */}
                    <div className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-border">
                      <div className={cn("h-1.5 w-1.5 rounded-full", isAdminComment ? "bg-primary" : "bg-muted-foreground")} />
                    </div>

                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={cn("text-xs font-semibold", isAdminComment ? "bg-primary/10 text-primary" : "bg-muted")}>
                        {initials(comment.user.fullname)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-foreground">
                          {comment.user.fullname}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[9px] px-1 py-0 px-1.5 leading-none',
                            isAdminComment
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {isAdminComment ? 'Admin' : 'User'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className={cn(
                        "rounded-xl border p-3.5 text-xs leading-relaxed text-foreground/90 bg-card shadow-xs",
                        isAdminComment && "border-primary/20 bg-primary/5/5"
                      )}>
                        <p className="whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Reply Box Form */}
              {ticket.status !== 'RESOLVED' ? (
                <form onSubmit={handlePostCommentSubmit} className="relative flex gap-3">
                  <div className="absolute -left-[30px] top-3 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-border">
                    <MessageSquare className="h-2 w-2 text-muted-foreground" />
                  </div>

                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs bg-muted">
                      {initials(ticketQuery.data?.ticket?.user?.fullname ?? '')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Write a reply..."
                      rows={3}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      required
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={postComment.isPending} size="sm" className="gap-1.5">
                        {postComment.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Comment
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-800 text-xs">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold">This ticket is marked as Resolved.</p>
                    <p className="text-emerald-700/80 mt-0.5">
                      No further replies can be posted. If you are still experiencing the issue, please submit a new ticket.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Diagnostic Sidebar & Admin Controls */}
          <div className="space-y-4">
            {role === 'ADMIN' ? (
              <Card>
                <CardHeader className="p-4 border-b">
                  <CardTitle className="text-sm font-bold">Admin Triage Controls</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Ticket Status
                    </label>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                      disabled={updateTicket.isPending}
                      className="w-full h-8 rounded-lg border bg-card px-2.5 text-xs focus:outline-none"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Priority Level
                    </label>
                    <select
                      value={ticket.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                      disabled={updateTicket.isPending}
                      className="w-full h-8 rounded-lg border bg-card px-2.5 text-xs focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>

                  {ticket.status !== 'RESOLVED' && (
                    <Button
                      onClick={() => handleStatusChange('RESOLVED')}
                      disabled={updateTicket.isPending}
                      variant="outline"
                      className="w-full h-8 text-xs gap-1 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark as resolved
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Diagnostic / Metadata Information */}
            <Card>
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  Diagnostic Info
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 text-xs">
                <div className="space-y-1 leading-tight">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Category
                  </span>
                  <span className="font-semibold text-foreground">
                    {categoryLabels[ticket.category]}
                  </span>
                </div>

                <div className="space-y-1 leading-tight">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Reporter
                  </span>
                  <span className="font-medium text-foreground">{ticket.user.fullname}</span>
                  <span className="text-muted-foreground block text-[10px]">
                    Role: <span className="capitalize">{ticket.user.role.toLowerCase()}</span>
                  </span>
                </div>

                {ticket.metadata && typeof ticket.metadata === 'object' ? (
                  <>
                    <Separator />

                    {ticket.metadata.pageUrl && (
                      <div className="space-y-1 leading-tight">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Source URL
                        </span>
                        <span className="text-muted-foreground font-mono text-[10px] break-all">
                          {ticket.metadata.pageUrl as string}
                        </span>
                      </div>
                    )}

                    {ticket.metadata.screenResolution && (
                      <div className="space-y-1 leading-tight">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Screen Resolution
                        </span>
                        <span className="font-medium font-mono text-[10px] text-foreground">
                          {ticket.metadata.screenResolution as string}
                        </span>
                      </div>
                    )}

                    {ticket.metadata.userAgent && (
                      <div className="space-y-1 leading-tight">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Browser User Agent
                        </span>
                        <span className="text-muted-foreground font-mono text-[10px] line-clamp-3 leading-normal">
                          {ticket.metadata.userAgent as string}
                        </span>
                      </div>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </Shell>
  );
}
