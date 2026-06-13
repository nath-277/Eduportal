'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  FileText,
  Loader2,
  Megaphone,
  MessageCircle,
  Settings,
  X,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
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

interface NotificationMenuProps {
  role: UserRole;
  initialUnreadCount: number;
}

export function NotificationMenu({ role, initialUnreadCount }: NotificationMenuProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const queryKey = ['notifications', 'menu', role.toLowerCase()];

  const notificationsQuery = useQuery({
    queryKey,
    queryFn: async () => api.get<NotificationsResponse>('/notifications/mine'),
    initialData: { unreadCount: initialUnreadCount, notifications: [] },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const markOne = useMutation({
    mutationFn: async (id: string) =>
      api.patch<{ notification: Notification }>(`/notifications/${id}/read`, {}),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<NotificationsResponse>(queryKey);
      if (prev) {
        qc.setQueryData<NotificationsResponse>(queryKey, {
          unreadCount: Math.max(0, prev.unreadCount - (prev.notifications.find((n) => n.id === id && !n.isRead) ? 1 : 0)),
          notifications: prev.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error('Could not mark as read');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['notifications', 'badge'] });
    },
  });

  const markAll = useMutation({
    mutationFn: async () =>
      api.post<{ updated: number }>('/notifications/read-all', {}),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<NotificationsResponse>(queryKey);
      if (prev) {
        qc.setQueryData<NotificationsResponse>(queryKey, {
          unreadCount: 0,
          notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error('Could not mark all as read');
    },
    onSuccess: (data) => {
      toast.success(`${data.updated} marked as read`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['notifications', 'badge'] });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () =>
      api.delete<{ deleted: number }>('/notifications'),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<NotificationsResponse>(queryKey);
      if (prev) {
        qc.setQueryData<NotificationsResponse>(queryKey, {
          unreadCount: 0,
          notifications: [],
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error('Could not clear notifications');
    },
    onSuccess: (data) => {
      toast.success(`${data.deleted} notifications cleared`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['notifications', 'badge'] });
    },
  });

  const deleteOne = useMutation({
    mutationFn: async (id: string) =>
      api.delete<{ success: boolean }>(`/notifications/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<NotificationsResponse>(queryKey);
      if (prev) {
        const target = prev.notifications.find((n) => n.id === id);
        const unreadDiff = target && !target.isRead ? 1 : 0;
        qc.setQueryData<NotificationsResponse>(queryKey, {
          unreadCount: Math.max(0, prev.unreadCount - unreadDiff),
          notifications: prev.notifications.filter((n) => n.id !== id),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error('Could not delete notification');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['notifications', 'badge'] });
    },
  });

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const recent = notifications.slice(0, 6);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && notifications.length === 0) {
      notificationsQuery.refetch();
    }
  }

  function handleNotificationClick(n: Notification) {
    if (!n.isRead) markOne.mutate(n.id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  const notificationsHref = `/${role.toLowerCase()}/notifications`;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative"
        >
          <Bell className={cn('h-5 w-5', unreadCount > 0 && 'text-foreground')} />
          <AnimatePresence>
            {unreadCount > 0 ? (
              <motion.span
                key="badge"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: 'spring', damping: 18, stiffness: 320 }}
                className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium tabular-nums text-primary-foreground"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(380px,calc(100vw-2rem))] overflow-hidden p-0"
      >
        <header className="flex items-center justify-between border-b bg-muted/30 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary tabular-nums">
                {unreadCount} new
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="h-7 gap-1 px-2 text-xs"
                aria-label="Mark all as read"
              >
                {markAll.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3 w-3" />
                )}
                Mark all
              </Button>
            ) : null}
            {notifications.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Clear all notifications?')) {
                    clearAll.mutate();
                  }
                }}
                disabled={clearAll.isPending}
                className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label="Clear all notifications"
              >
                {clearAll.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Clear all
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>

        <div className="max-h-[min(480px,70vh)] overflow-y-auto">
          {notificationsQuery.isLoading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-md p-2">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">You&apos;re all caught up!</p>
                <p className="text-xs text-muted-foreground">
                  New notifications will appear here.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map((n) => {
                const meta = CATEGORY_META[n.category];
                const Icon = meta.icon;
                return (
                  <li key={n.id} className="relative group/item">
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        'group flex w-full items-start gap-2.5 p-3 pr-10 text-left transition-colors',
                        'hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none',
                        !n.isRead && 'bg-primary/[0.04]',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full',
                          meta.tone,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'line-clamp-1 text-sm',
                              !n.isRead ? 'font-semibold' : 'font-medium text-foreground/90',
                            )}
                          >
                            {n.title}
                          </p>
                          {!n.isRead ? (
                            <span
                              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                              aria-label="Unread"
                            />
                          ) : null}
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatTime(n.createdAt)} · {meta.label}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteOne.mutate(n.id);
                      }}
                      disabled={deleteOne.isPending}
                      aria-label="Delete notification"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 transition-opacity grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between border-t bg-muted/30 px-3 py-2">
          <span className="text-[10px] text-muted-foreground">
            {notifications.length > 0
              ? `Showing ${Math.min(recent.length, notifications.length)} of ${notifications.length}`
              : 'No notifications yet'}
          </span>
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Link href={notificationsHref} onClick={() => setOpen(false)}>
              View all
            </Link>
          </Button>
        </footer>
      </PopoverContent>
    </Popover>
  );
}
