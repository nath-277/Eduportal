'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
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

type FilterTab = 'ALL' | 'UNREAD' | 'ANNOUNCEMENT' | 'ACADEMIC' | 'FORUM' | 'SYSTEM';

interface GroupedNotifications {
  today: Notification[];
  yesterday: Notification[];
  older: Notification[];
}

function groupNotifications(list: Notification[]): GroupedNotifications {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const older: Notification[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;

  list.forEach((n) => {
    const t = new Date(n.createdAt).getTime();
    if (t >= startOfToday) {
      today.push(n);
    } else if (t >= startOfYesterday) {
      yesterday.push(n);
    } else {
      older.push(n);
    }
  });

  return { today, yesterday, older };
}

function tabLabel(tab: FilterTab): string {
  switch (tab) {
    case 'ALL': return 'All';
    case 'UNREAD': return 'Unread';
    case 'ANNOUNCEMENT': return 'Announcements';
    case 'ACADEMIC': return 'Academic';
    case 'FORUM': return 'Forum';
    case 'SYSTEM': return 'System';
  }
}

interface NotificationMenuProps {
  role: UserRole;
  initialUnreadCount: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NotificationMenu({
  role,
  initialUnreadCount,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: NotificationMenuProps) {
  const qc = useQueryClient();
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : localOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setLocalOpen;

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    const media = window.matchMedia('(max-width: 767px)');
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => {
      clearTimeout(timer);
      media.removeEventListener('change', listener);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const queryKey = ['notifications', 'mine', role.toLowerCase()];

  const notificationsQuery = useQuery({
    queryKey,
    queryFn: async () => api.get<NotificationsResponse>('/notifications/mine'),
    initialData: { unreadCount: initialUnreadCount, notifications: [] },
    refetchInterval: 30_000,
    staleTime: 15_000,
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

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && notifications.length === 0) {
      notificationsQuery.refetch();
    }
  }

  const notificationsHref = `/${role.toLowerCase()}/notifications`;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'UNREAD') return !n.isRead;
    if (activeTab === 'ACADEMIC') return n.category === 'RESULT' || n.category === 'RESOURCE';
    return n.category === activeTab;
  });

  const grouped = groupNotifications(filteredNotifications);
  const hasNotifications =
    grouped.today.length > 0 || grouped.yesterday.length > 0 || grouped.older.length > 0;

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'UNREAD', label: 'Unread' },
    { id: 'ANNOUNCEMENT', label: 'Announcements' },
    { id: 'ACADEMIC', label: 'Academic' },
    { id: 'FORUM', label: 'Forum' },
    { id: 'SYSTEM', label: 'System' },
  ];

  const renderGroup = (title: string, list: Notification[]) => {
    if (list.length === 0) return null;
    return (
      <div key={title} className="space-y-0.5">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-t border-border/40 first:border-t-0">
          {title}
        </div>
        <ul className="divide-y divide-border/20">
          {list.map((n) => {
            const meta = CATEGORY_META[n.category] || CATEGORY_META.SYSTEM;
            const Icon = meta.icon;
            return (
              <li key={n.id} className="relative group/item">
                <div
                  className={cn(
                    'flex w-full items-start gap-2.5 p-3 pr-10 text-left transition-colors',
                    !n.isRead && 'bg-primary/[0.03]',
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
                    <p className="line-clamp-2 text-xs text-muted-foreground mt-0.5 leading-normal">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/80 flex items-center gap-1.5">
                      <span>{formatTime(n.createdAt)}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground/60">{meta.label}</span>
                    </p>
                  </div>
                </div>
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
      </div>
    );
  };

  const notificationsList = (isMobileView: boolean = false) => (
    <div className={cn("flex flex-col bg-background", isMobileView ? "h-full" : "w-[380px] max-h-[480px]")}>
      <header className="flex items-center justify-between border-b bg-muted/30 px-3.5 py-2.5 shrink-0">
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
          {!isMobileView ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </header>

      {/* Filter Tabs scrollbar-none */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto px-3.5 py-2 border-b bg-background/50 shrink-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors border",
                active
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto min-h-0">
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
        ) : !hasNotifications ? (
          <div className="flex flex-col items-center gap-2.5 px-4 py-12 text-center my-auto">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground animate-pulse">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">You&apos;re all caught up!</p>
              <p className="text-xs text-muted-foreground max-w-[250px] mx-auto mt-1 leading-relaxed">
                {activeTab === 'ALL'
                  ? 'New notifications will appear here.'
                  : `No notifications found matching "${tabLabel(activeTab)}".`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {renderGroup('Today', grouped.today)}
            {renderGroup('Yesterday', grouped.yesterday)}
            {renderGroup('Older', grouped.older)}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between border-t bg-muted/30 px-3.5 py-2 shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {filteredNotifications.length > 0
            ? `Showing ${filteredNotifications.length} items`
            : 'No notifications'}
        </span>
        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Link href={notificationsHref} onClick={() => setOpen(false)}>
            View all
          </Link>
        </Button>
      </footer>
    </div>
  );

  return (
    <>
      {/* Desktop View: Popover */}
      <div className="hidden md:block">
        {!mounted || !isMobile ? (
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
              className="w-[380px] overflow-hidden p-0"
            >
              {notificationsList(false)}
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            className="relative"
          >
            <Bell className={cn('h-5 w-5', unreadCount > 0 && 'text-foreground')} />
          </Button>
        )}
      </div>

      {/* Mobile View: Slide Up Bottom Drawer */}
      <div className="block md:hidden">
        {mounted && isMobile ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              onClick={() => handleOpenChange(true)}
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

            {mounted && typeof document !== 'undefined' ? (
              createPortal(
                <AnimatePresence>
                  {open ? (
                    <motion.div
                      className="fixed inset-0 z-[70] flex items-end justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      role="dialog"
                      aria-modal="true"
                      aria-label="Notifications Drawer"
                    >
                      <button
                        type="button"
                        aria-label="Close notifications"
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                        onClick={() => handleOpenChange(false)}
                      />
                      <motion.div
                        className="relative w-full max-w-md h-[50vh] overflow-hidden rounded-t-3xl border-t border-border bg-background shadow-2xl pb-[env(safe-area-inset-bottom)] flex flex-col z-10"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.15}
                        onDragEnd={(_, info) => {
                          if (info.offset.y > 80 || info.velocity.y > 500) {
                            handleOpenChange(false);
                          }
                        }}
                      >
                        {/* Drag handle */}
                        <div className="flex justify-center pb-1 pt-3 shrink-0">
                          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
                        </div>

                        {/* Notifications content */}
                        <div className="flex-1 min-h-0">
                          {notificationsList(true)}
                        </div>
                      </motion.div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>,
                document.body
              )
            ) : null}
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            className="relative"
          >
            <Bell className={cn('h-5 w-5', unreadCount > 0 && 'text-foreground')} />
          </Button>
        )}
      </div>
    </>
  );
}

