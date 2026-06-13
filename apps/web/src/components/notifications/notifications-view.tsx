'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  FileText,
  Megaphone,
  MessageCircle,
  Settings,
  Trash2,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { NotificationCategory, UserRole } from '@eduportal/shared';

interface Notification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  unreadCount: number;
  notifications: Notification[];
}

const CATEGORY_META: Record<
  NotificationCategory,
  { icon: typeof Bell; tone: string; label: string }
> = {
  ANNOUNCEMENT: { icon: Megaphone, tone: 'bg-primary/10 text-primary', label: 'Announcement' },
  RESULT: { icon: FileText, tone: 'bg-emerald-500/10 text-emerald-600', label: 'Result' },
  RESOURCE: { icon: FileText, tone: 'bg-blue-500/10 text-blue-600', label: 'Resource' },
  FORUM: { icon: MessageCircle, tone: 'bg-indigo-500/10 text-indigo-600', label: 'Forum' },
  SYSTEM: { icon: Settings, tone: 'bg-muted text-muted-foreground', label: 'System' },
};

function formatTime(d: string): string {
  const ts = new Date(d).getTime();
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

function groupKey(d: string): string {
  const now = new Date();
  const date = new Date(d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'This Week';
  return 'Earlier';
}

const GROUP_ORDER: string[] = ['Today', 'Yesterday', 'This Week', 'Earlier'];

function groupNotifications(
  notifs: Notification[],
): Array<{ label: string; items: Notification[] }> {
  const groups = new Map<string, Notification[]>();
  for (const n of notifs) {
    const key = groupKey(n.createdAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }
  return GROUP_ORDER.filter((k) => groups.has(k)).map((k) => ({
    label: k,
    items: groups.get(k)!,
  }));
}

function NotificationRow({
  n,
  onClick,
  isMarking,
  onDelete,
  isDeleting,
}: {
  n: Notification;
  onClick: () => void;
  isMarking: boolean;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const meta = CATEGORY_META[n.category] ?? CATEGORY_META.SYSTEM;
  const Icon = meta.icon;
  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-3 transition-colors',
        n.isRead ? '' : 'bg-primary/[0.03] border-l-4 border-primary',
      )}
    >
      <div
        className={cn(
          'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg',
          meta.tone,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('text-sm', n.isRead ? 'text-foreground' : 'font-medium')}>
            {n.title}
          </p>
          {!n.isRead ? (
            <span
              className="inline-flex h-2 w-2 shrink-0 rounded-full bg-primary"
              aria-label="Unread"
            />
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formatTime(n.createdAt)}</p>
      </div>
      <div className="flex items-center gap-1">
        {!n.isRead ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick();
            }}
            disabled={isMarking}
            aria-label="Mark as read"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          aria-label="Delete notification"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  if (n.link) {
    return (
      <Link href={n.link} className="block" onClick={onClick}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left"
      disabled={isMarking}
    >
      {content}
    </button>
  );
}

interface NotificationsViewProps {
  role: UserRole;
}

export function NotificationsView({ role }: NotificationsViewProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>('all');

  const query = useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: async () => api.get<NotificationsResponse>('/notifications/mine'),
    refetchInterval: 60_000,
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      return api.patch<{ notification: Notification }>(`/notifications/${id}/read`, {});
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['notifications', 'mine'] });
      const prev = qc.getQueryData<NotificationsResponse>(['notifications', 'mine']);
      if (prev) {
        qc.setQueryData<NotificationsResponse>(['notifications', 'mine'], {
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
          notifications: prev.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notifications', 'mine'], ctx.prev);
      toast.error('Could not mark as read');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      return api.delete<{ success: boolean }>(`/notifications/${id}`);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['notifications', 'mine'] });
      const prev = qc.getQueryData<NotificationsResponse>(['notifications', 'mine']);
      if (prev) {
        const target = prev.notifications.find((n) => n.id === id);
        const unreadDiff = target && !target.isRead ? 1 : 0;
        qc.setQueryData<NotificationsResponse>(['notifications', 'mine'], {
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - unreadDiff),
          notifications: prev.notifications.filter((n) => n.id !== id),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notifications', 'mine'], ctx.prev);
      toast.error('Could not delete notification');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      return api.patch<{ updated: number }>('/notifications/read-all', {});
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['notifications', 'mine'] });
      const prev = qc.getQueryData<NotificationsResponse>(['notifications', 'mine']);
      if (prev) {
        qc.setQueryData<NotificationsResponse>(['notifications', 'mine'], {
          unreadCount: 0,
          notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notifications', 'mine'], ctx.prev);
      toast.error('Could not mark all as read');
    },
    onSuccess: (data) => {
      toast.success(`${data.updated} marked as read`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      return api.delete<{ deleted: number }>('/notifications');
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['notifications', 'mine'] });
      const prev = qc.getQueryData<NotificationsResponse>(['notifications', 'mine']);
      if (prev) {
        qc.setQueryData<NotificationsResponse>(['notifications', 'mine'], {
          unreadCount: 0,
          notifications: [],
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notifications', 'mine'], ctx.prev);
      toast.error('Could not clear notifications');
    },
    onSuccess: (data) => {
      toast.success(`${data.deleted} notifications cleared`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const all = query.data?.notifications ?? [];
  const unread = query.data?.unreadCount ?? 0;

  const filtered = useMemo(() => {
    switch (tab) {
      case 'unread':
        return all.filter((n) => !n.isRead);
      case 'announcements':
        return all.filter((n) => n.category === 'ANNOUNCEMENT');
      case 'results':
        return all.filter((n) => n.category === 'RESULT');
      case 'resources':
        return all.filter((n) => n.category === 'RESOURCE');
      case 'system':
        return all.filter((n) => n.category === 'SYSTEM');
      case 'all':
      default:
        return all;
    }
  }, [all, tab]);

  const grouped = useMemo(() => groupNotifications(filtered), [filtered]);

  const headerSubtitle = query.isLoading
    ? 'Loading…'
    : unread > 0
      ? `${unread} unread notification${unread > 1 ? 's' : ''}.`
      : 'All caught up.';

  const tabs = useMemo(() => {
    const list = [
      { id: 'all', label: 'All', count: all.length },
      { id: 'unread', label: 'Unread', count: unread },
      { id: 'announcements', label: 'Announcements', count: all.filter(n => n.category === 'ANNOUNCEMENT').length },
    ];
    if (role === 'STUDENT') {
      list.push(
        { id: 'results', label: 'Results', count: all.filter(n => n.category === 'RESULT').length },
        { id: 'resources', label: 'Resources', count: all.filter(n => n.category === 'RESOURCE').length },
      );
    }
    list.push({ id: 'system', label: 'System', count: all.filter(n => n.category === 'SYSTEM').length });
    return list;
  }, [all, unread, role]);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={headerSubtitle}
        actions={
          all.length > 0 ? (
            <div className="flex items-center gap-2">
              {unread > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  className="gap-1.5"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </Button>
              ) : null}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all notifications?')) {
                    clearAll.mutate();
                  }
                }}
                disabled={clearAll.isPending}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Clear all
              </Button>
            </div>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="w-full overflow-x-auto sm:w-fit">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
              {t.label}
              {t.count > 0 ? (
                <Badge
                  variant={t.id === 'unread' ? 'default' : 'secondary'}
                  className="h-4 px-1.5 text-[10px]"
                >
                  {t.count}
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {query.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <EmptyState
              icon={tab === 'unread' ? BellOff : Bell}
              title={tab === 'unread' ? 'No unread notifications' : 'Nothing here yet'}
              description={
                tab === 'unread'
                  ? 'You have read every notification. New ones will appear here.'
                  : tab === 'all'
                    ? 'New announcements, results, and forum activity will show up here.'
                    : 'Nothing in this category right now.'
              }
            />
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <motion.div
                  key={group.label}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </h2>
                  <Card>
                    <CardContent className="divide-y p-0">
                      {group.items.map((n) => (
                        <NotificationRow
                          key={n.id}
                          n={n}
                          isMarking={markOne.isPending}
                          isDeleting={deleteOne.isPending}
                          onDelete={() => deleteOne.mutate(n.id)}
                          onClick={() => {
                            if (!n.isRead) {
                              markOne.mutate(n.id);
                            }
                            if (n.link) {
                              router.push(n.link);
                            }
                          }}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
