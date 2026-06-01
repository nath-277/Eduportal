'use client';

import { StudentShell } from '@/components/layout/student-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function StudentSettingsPage() {
  return (
    <StudentShell>
      <PageHeader
        title="Settings"
        subtitle="Personalize your experience."
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
          <Construction className="h-6 w-6 text-primary" />
          <p>Settings are coming in the next milestone.</p>
        </CardContent>
      </Card>
    </StudentShell>
  );
}
