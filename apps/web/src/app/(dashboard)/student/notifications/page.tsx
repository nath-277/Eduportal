'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle2 } from 'lucide-react';

import { StudentShell } from '@/components/layout/student-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  unreadCount: number;
  notifications: Notification[];
}

const CATEGORY_TONE: Record<string, string> = {
  ANNOUNCEMENT: 'bg-primary/10 text-primary',
  RESULT: 'bg-emerald-500/10 text-emerald-600',
  FORUM: 'bg-indigo-500/10 text-indigo-600',
  ENROLLMENT: 'bg-amber-500/10 text-amber-600',
};

export default function StudentNotificationsPage() {
  const q = useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: async () => api.get<NotificationsResponse>('/notifications/mine?limit=50'),
  });

  const notifications = q.data?.notifications ?? [];
  const unread = q.data?.unreadCount ?? 0;

  return (
    <StudentShell>
      <PageHeader
        title="Notifications"
        subtitle={
          unread > 0
            ? `${unread} unread notification${unread > 1 ? 's' : ''}.`
            : 'All caught up.'
        }
      />

      <Card className="mt-6">
        <CardContent className="p-3">
          {q.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              description="New announcements, results, and forum activity will show up here."
            />
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3 p-3">
                  <div
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      CATEGORY_TONE[n.category] ?? 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {n.isRead ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                          new
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </StudentShell>
  );
}
