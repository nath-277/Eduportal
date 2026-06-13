'use client';

import { LecturerShell } from '@/components/layout/lecturer-shell';
import { NotificationsView } from '@/components/notifications/notifications-view';

export default function LecturerNotificationsPage() {
  return (
    <LecturerShell>
      <NotificationsView role="LECTURER" />
    </LecturerShell>
  );
}
