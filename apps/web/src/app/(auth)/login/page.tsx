'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, Mail, Sparkles, ShieldCheck, Layers } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { applyTheme, roleThemes } from '@/lib/themes';
import type { User, UserRole } from '@eduportal/shared';

interface AuthResponse {
  user: User;
  token: string;
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or matric number is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const featureBullets = [
  { icon: Layers, label: 'Course, results, and announcements in one place' },
  { icon: ShieldCheck, label: 'Role-based access for students, lecturers, and admins' },
  { icon: Sparkles, label: 'GPA tracking and downloadable transcripts' },
];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { data: settings } = useSettings();

  const hasLogo = !!settings?.portalLogoUrl;
  const portalName = settings?.portalName || 'EduPortal';
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', remember: true },
  });

  const remember = watch('remember');

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const data = await api.post<AuthResponse>('/auth/login', {
        identifier: values.identifier,
        password: values.password,
      });
      setAuth(data.user, data.token);
      applyTheme(roleThemes[data.user.role]);
      toast.success(`Welcome back, ${data.user.fullname.split(' ')[0]}`);
      router.push(roleHome(data.user.role));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-indigo-700 text-primary-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-16">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className={cn(
              "grid h-9 w-9 place-items-center rounded-xl overflow-hidden",
              hasLogo ? "" : "bg-white/10 backdrop-blur"
            )}>
              <Logo className={hasLogo ? "h-9 w-9" : "h-9 w-9 p-1.5"} iconClassName="h-5 w-5" />
            </span>
            {portalName}
          </Link>
          <div className="space-y-8">
            <motion.h2
              className="text-4xl font-semibold leading-tight xl:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Run your department on a single, calm source of truth.
            </motion.h2>
            <p className="max-w-md text-base text-primary-foreground/80">
              {portalName} brings course management, results, and announcements
              together so students and lecturers spend less time chasing context
              and more time on the work.
            </p>
            <ul className="space-y-3 text-sm">
              {featureBullets.map((b) => (
                <li key={b.label} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 backdrop-blur">
                    <b.icon className="h-4 w-4" />
                  </span>
                  <span className="text-primary-foreground/90">{b.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-primary-foreground/60">
            © {new Date().getFullYear()} {portalName}. Built for the Department of
            Computer Science.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden"
          >
            <span className={cn(
              "grid h-8 w-8 place-items-center rounded-lg overflow-hidden",
              hasLogo ? "" : "bg-primary text-primary-foreground"
            )}>
              <Logo className={hasLogo ? "h-8 w-8" : "h-8 w-8 p-1.5"} iconClassName="h-4 w-4" />
            </span>
            {portalName}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with your university email or matric number to continue.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or matric number</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="identifier"
                    autoComplete="username"
                    placeholder="you@department.edu"
                    className="pl-9"
                    aria-invalid={Boolean(errors.identifier)}
                    {...register('identifier')}
                  />
                </div>
                {errors.identifier && (
                  <p className="text-xs text-destructive">
                    {errors.identifier.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="px-9"
                    aria-invalid={Boolean(errors.password)}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) =>
                    setValue('remember', v === true, { shouldValidate: true })
                  }
                />
                <span className="text-muted-foreground">Keep me signed in</span>
              </label>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                New to {portalName}?{' '}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Create an account
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function roleHome(role: UserRole): string {
  switch (role) {
    case 'STUDENT':
      return '/student/dashboard';
    case 'LECTURER':
      return '/lecturer/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
  }
}
