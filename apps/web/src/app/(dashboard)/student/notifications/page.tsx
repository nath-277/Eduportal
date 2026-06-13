'use client';

import { StudentShell } from '@/components/layout/student-shell';
import { NotificationsView } from '@/components/notifications/notifications-view';

export default function StudentNotificationsPage() {
  return (
    <StudentShell>
      <NotificationsView role="STUDENT" />
    </StudentShell>
  );
}
