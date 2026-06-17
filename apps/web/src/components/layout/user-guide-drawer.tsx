'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { UserRole } from '@eduportal/shared';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface UserGuideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: UserRole;
}

interface GuideScenario {
  title: string;
  steps: string[];
}

const STUDENT_GUIDES: GuideScenario[] = [
  {
    title: 'Course Registration',
    steps: [
      'Navigate to the "Courses" page from the sidebar navigation.',
      'You will automatically see the current active session and semester open for registration.',
      'Browse available department courses and click "Add to Cart" to select them.',
      'Review your course selections in the registration cart details.',
      'Click "Confirm Registration" to finalize your enrollment for the semester.',
    ],
  },
  {
    title: 'Viewing Academic Results & GPA',
    steps: [
      'Navigate to the "Results" page from the sidebar navigation.',
      'View your summary tiles for Semester GPA, Cumulative GPA (CGPA), and Total Credit Units.',
      'Filter results dynamically by choosing a specific session or semester from the dropdown filters.',
      'To export or print a physical slip, click the "Print Slip" button at the top right.',
    ],
  },
  {
    title: 'Forum and Communities',
    steps: [
      'Go to the "Forum" section to communicate with other students.',
      'Browse public groups or request access to private level/department communities.',
      'Create new posts, add relevant tags, and reply to ongoing student discussions.',
    ],
  },
];

const LECTURER_GUIDES: GuideScenario[] = [
  {
    title: 'Grade Entry and Excel/CSV Upload',
    steps: [
      'Select a course from your assigned list on the Dashboard.',
      'Prepare a CSV file containing three columns: "matricNumber", "caScore", and "examScore".',
      'Drag and drop the CSV file into the results uploader panel.',
      'Check the upload summary for any failed matric numbers or validation errors.',
    ],
  },
  {
    title: 'Submitting Course Results',
    steps: [
      'After uploading/saving grades, verify that the grade distribution looks correct.',
      'Click "Submit Results" to lock changes and push the list to the administrator.',
      'Once submitted, results cannot be changed unless rolled back by the administrator.',
    ],
  },
];

const ADMIN_GUIDES: GuideScenario[] = [
  {
    title: 'Managing Sessions and Semesters',
    steps: [
      'Go to the "Sessions" tab from the admin navigation panel.',
      'Create new academic sessions and set the current active session.',
      'Set the active semester (First or Second) to enforce course registration rules.',
    ],
  },
  {
    title: 'Result Approvals and Rollbacks',
    steps: [
      'Go to the "Results" section to view submitted grades from lecturers.',
      'Select the corresponding academic session from the top dropdown filter.',
      'Click "Approve All" to verify, or "Push All" to publish results directly to students.',
      'Use the "Rollback" action to withdraw published/approved results back to draft status for correction.',
    ],
  },
];

export function UserGuideDrawer({ open, onOpenChange, role }: UserGuideDrawerProps) {
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);

  const guides = {
    STUDENT: STUDENT_GUIDES,
    LECTURER: LECTURER_GUIDES,
    ADMIN: ADMIN_GUIDES,
  }[role];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto border-l bg-card p-6" side="right">
        <SheetHeader className="p-0 pb-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="h-5 w-5" />
            <SheetTitle className="text-xl font-bold">User Guide</SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Learn step-by-step how to navigate and manage features as a{' '}
            <span className="font-semibold text-foreground capitalize">
              {role.toLowerCase()}
            </span>
            .
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-primary/5 p-4 border border-primary/10">
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Interactive Assistance</p>
              <p className="text-muted-foreground mt-0.5">
                Need extra support? Use the **Support** page to open tickets directly for admins.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {guides.map((g, index) => {
              const isOpen = activeAccordion === index;
              return (
                <div
                  key={g.title}
                  className="rounded-xl border border-border bg-background/50 overflow-hidden transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => setActiveAccordion(isOpen ? null : index)}
                    className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-foreground hover:bg-muted/40 transition"
                  >
                    <span>{g.title}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {isOpen ? (
                    <div className="border-t border-border px-4 py-3 bg-card/30">
                      <ol className="list-decimal pl-4 space-y-2 text-xs text-muted-foreground">
                        {g.steps.map((step, sIdx) => (
                          <li key={sIdx} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
