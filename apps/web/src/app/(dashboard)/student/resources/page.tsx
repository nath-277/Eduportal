'use client';

import { StudentShell } from '@/components/layout/student-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function StudentResourcesPage() {
  return (
    <StudentShell>
      <PageHeader
        title="Resource library"
        subtitle="Course materials uploaded by your lecturers."
      />
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
          <Construction className="h-6 w-6 text-primary" />
          <p>Resource library is coming in the next milestone.</p>
        </CardContent>
      </Card>
    </StudentShell>
  );
}
