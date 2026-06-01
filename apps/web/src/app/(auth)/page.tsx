'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { roleHome } from '@/hooks/use-auth-guard';
import type { UserRole } from '@eduportal/shared';

const features = [
  {
    icon: BookOpen,
    title: 'Course management',
    body: 'Enroll, drop, and track your courses with the 24-unit credit cap enforced automatically.',
  },
  {
    icon: Trophy,
    title: 'Results and GPA',
    body: 'See per-semester results, GPA, and CGPA the moment lecturers publish them.',
  },
  {
    icon: Users,
    title: 'Discussion forum',
    body: 'Ask, answer, and bookmark — keep departmental knowledge searchable and threaded.',
  },
  {
    icon: Sparkles,
    title: 'Resource library',
    body: 'Lecture notes, past questions, and assignments stored in one place and one click away.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(roleHome(user.role as UserRole));
    }
  }, [isAuthenticated, user, router]);

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-5 pb-20 pt-16 sm:pt-24">
      <header className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          EduPortal
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="mt-16 grid w-full items-center gap-10 sm:mt-24 md:grid-cols-2">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Departmental portal · Beta
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Your department, one workspace.
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            EduPortal is the single place where students, lecturers, and admins handle
            enrollments, results, resources, announcements, and discussions.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                Create an account
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">I already have one</Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-dashed">
          <CardContent className="space-y-4 p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              What you get on day one
            </p>
            <ul className="space-y-3">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{f.title}</p>
                      <p className="text-sm text-muted-foreground">{f.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>

      <footer className="mt-20 w-full text-center text-xs text-muted-foreground">
        Built for the Department of Computer Science. © {new Date().getFullYear()}.
      </footer>
    </main>
  );
}
