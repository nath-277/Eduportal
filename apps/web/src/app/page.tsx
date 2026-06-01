'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { useAuthStore } from '@/stores/auth.store';
import { applyTheme, clearTheme, roleThemes } from '@/lib/themes';
import type { UserRole } from '@eduportal/shared';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: ClipboardList,
    title: 'Student records',
    description: 'A single canonical record per student with department, level, and enrollment history.',
  },
  {
    icon: BarChart3,
    title: 'Result management',
    description: 'Upload results as JSON or CSV, compute GPA, and publish to students on a clean schedule.',
  },
  {
    icon: FileText,
    title: 'Resource library',
    description: 'Lecturers upload course materials; students search, preview, and download in one place.',
  },
  {
    icon: MessageSquare,
    title: 'Discussion forum',
    description: 'Threaded conversations per course with tags and instructor moderation.',
  },
  {
    icon: Bell,
    title: 'Announcements',
    description: 'Targeted, role-aware announcements with read receipts and notification fan-out.',
  },
  {
    icon: ShieldCheck,
    title: 'Analytics',
    description: 'Enrollment, performance, and engagement dashboards for lecturers and admins.',
  },
];

const steps = [
  {
    title: 'Register',
    description: 'Create a student or lecturer account, pick your department, and confirm your email.',
    icon: Users,
  },
  {
    title: 'Access dashboard',
    description: 'See your courses, results, and announcements in one calm, role-aware view.',
    icon: BookOpen,
  },
  {
    title: 'Collaborate',
    description: 'Join forum threads, download resources, and stay current with your department.',
    icon: MessageSquare,
  },
];

const stats = [
  { value: 1000, suffix: '+', label: 'Students' },
  { value: 50, suffix: '+', label: 'Courses' },
  { value: 100, suffix: '+', label: 'Resources' },
];

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- hydration gate */
  useEffect(() => {
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const role = user?.role;

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated && role) {
      applyTheme(roleThemes[role]);
    } else {
      clearTheme();
    }
  }, [hydrated, isAuthenticated, role]);

  const getStartedHref = isAuthenticated ? roleHome(role) : '/register';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header isAuthenticated={hydrated && isAuthenticated} />

      <main>
        <Hero getStartedHref={getStartedHref} />
        <StatsRow />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}


function Header({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </span>
          EduPortal
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition hover:text-foreground">Features</a>
          <a href="#how-it-works" className="transition hover:text-foreground">How it works</a>
          <a href="#cta" className="transition hover:text-foreground">Get started</a>
        </nav>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button asChild>
              <Link href="/login">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ getStartedHref }: { getStartedHref: string }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_60%)]" />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7"
          >
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              New: GPA auto-computation is live
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              The academic portal your department deserves.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              EduPortal brings course management, results, and announcements into a
              single calm surface — so students, lecturers, and admins stop chasing
              context and start getting work done.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href={getStartedHref}>
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> No credit card
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Free for departments
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Role-based access
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-5"
          >
            <MockDashboardCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function MockDashboardCard() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/30 via-indigo-300/30 to-fuchsia-300/30 blur-2xl" />
      <div className="rounded-2xl border bg-card p-5 shadow-2xl">
        <div className="flex items-center gap-2 border-b pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs text-muted-foreground">eduportal / dashboard</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat label="GPA" value="4.62" tone="primary" />
          <MiniStat label="Courses" value="6" tone="emerald" />
          <MiniStat label="Resources" value="34" tone="indigo" />
          <MiniStat label="Forum posts" value="128" tone="amber" />
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">Performance trend</p>
          <Sparkline />
        </div>
        <div className="mt-4 space-y-2">
          <MockRow title="CSC 301 — Algorithms" meta="A · 5.0 GPA" />
          <MockRow title="CSC 305 — Databases" meta="B · 4.0 GPA" />
          <MockRow title="CSC 311 — Networking" meta="A · 5.0 GPA" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'emerald' | 'indigo' | 'amber' }) {
  const toneMap: Record<typeof tone, string> = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    indigo: 'bg-indigo-500/10 text-indigo-600',
    amber: 'bg-amber-500/10 text-amber-600',
  };
  return (
    <div className={['rounded-xl p-3', toneMap[tone]].join(' ')}>
      <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function Sparkline() {
  const points = [12, 18, 14, 22, 28, 24, 30, 36, 32, 40, 44, 48];
  const max = Math.max(...points);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * 12} ${48 - (p / max) * 40}`)
    .join(' ');
  return (
    <svg viewBox="0 0 144 48" className="mt-1 h-12 w-full text-primary">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MockRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background/40 px-3 py-2 text-xs">
      <span className="truncate font-medium">{title}</span>
      <span className="text-muted-foreground">{meta}</span>
    </div>
  );
}

function StatsRow() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto grid max-w-6xl grid-cols-3 gap-6 px-4 py-10 sm:px-6 lg:px-8">
        {stats.map((s) => (
          <Counter key={s.label} target={s.value} suffix={s.suffix} label={s.label} />
        ))}
      </div>
    </section>
  );
}

function Counter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {n}
        {suffix}
      </p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          What is inside
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Every tool your department needs.
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Six focused modules, each one doing one thing well.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="group rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <f.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Up and running in three steps.
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            No installations, no IT tickets, no training day.
          </p>
        </motion.div>

        <div className="relative mt-14">
          <div className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
          <ol className="grid gap-10 lg:grid-cols-3 lg:gap-6">
            {steps.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative flex flex-col items-center text-center"
              >
                <span className="relative z-10 grid h-[72px] w-[72px] place-items-center rounded-full border-2 border-primary bg-background text-primary shadow-sm">
                  <s.icon className="h-6 w-6" />
                </span>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {i + 1}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  {s.description}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section id="cta" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-indigo-700 p-10 text-primary-foreground sm:p-14"
      >
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Bring calm to your department&rsquo;s busiest week.
          </h2>
          <p className="mt-3 text-base text-primary-foreground/80">
            Set up your account in under two minutes. No credit card, no commitment.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/register">
                Create an account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-2 text-base font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </span>
            EduPortal
          </Link>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            The academic portal your department deserves. Built for students,
            lecturers, and admins who want less ceremony and more focus.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm md:justify-self-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Product
            </p>
            <ul className="mt-3 space-y-2">
              <li><a href="#features" className="hover:underline">Features</a></li>
              <li><a href="#how-it-works" className="hover:underline">How it works</a></li>
              <li><Link href="/register" className="hover:underline">Get started</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Company
            </p>
            <ul className="mt-3 space-y-2">
              <li><a href="#" className="hover:underline">Privacy</a></li>
              <li><a href="#" className="hover:underline">Terms</a></li>
              <li><a href="#" className="hover:underline">Contact</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} EduPortal. All rights reserved.</p>
          <p>Built for the Department of Computer Science.</p>
        </div>
      </div>
    </footer>
  );
}

function roleHome(role: UserRole | undefined): string {
  switch (role) {
    case 'STUDENT':
      return '/student/dashboard';
    case 'LECTURER':
      return '/lecturer/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    default:
      return '/login';
  }
}
