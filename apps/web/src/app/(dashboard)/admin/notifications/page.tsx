'use client';

import { AdminShell } from '@/components/layout/admin-shell';
import { NotificationsView } from '@/components/notifications/notifications-view';

export default function AdminNotificationsPage() {
  return (
    <AdminShell>
      <NotificationsView role="ADMIN" />
    </AdminShell>
  );
}
