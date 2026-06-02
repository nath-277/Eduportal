'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { AlertOctagon, ArrowLeft, Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { roleHome } from '@/hooks/use-auth-guard';
import type { UserRole } from '@eduportal/shared';

const ROLE_COPY: Record<UserRole, { title: string; body: string }> = {
  STUDENT: {
    title: 'Lost on the way to class',
    body: 'The page you tried to open does not exist. Head back to your dashboard to find the right link.',
  },
  LECTURER: {
    title: 'No lecture material here',
    body: 'This page could not be found. Return to your dashboard to manage courses and results.',
  },
  ADMIN: {
    title: 'Page not found',
    body: 'The page you requested is missing. Head back to the admin console.',
  },
};

function subscribeToHydration(callback: () => void): () => void {
  return useAuthStore.persist.onFinishHydration(callback);
}

function getHydrationSnapshot(): boolean {
  return useAuthStore.persist.hasHydrated();
}

function getServerHydrationSnapshot(): boolean {
  return false;
}

export default function NotFound() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  const role = user?.role;
  const copy = role && hydrated ? ROLE_COPY[role] : null;
  const homeHref = role && hydrated ? roleHome(role) : '/login';

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <AlertOctagon className="h-8 w-8" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {hydrated && copy ? copy.title : 'Page not found'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {hydrated && copy
            ? copy.body
            : 'The page you are looking for might have been moved or never existed.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button asChild className="gap-1.5">
            <Link href={homeHref}>
              <Home className="h-4 w-4" />
              Go to dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1.5">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
