'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, GraduationCap, KeyRound, Loader2, Lock } from 'lucide-react';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Needs an uppercase letter')
      .regex(/[a-z]/, 'Needs a lowercase letter')
      .regex(/\d/, 'Needs a number'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type Values = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!token) {
      toast.error('Reset token missing. Request a new link.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password: values.password,
      });
      toast.success('Password updated. Please sign in.');
      router.push('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reset failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-12">
      <Link
        href="/login"
        className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border bg-card p-8 shadow-sm"
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a strong password you do not reuse anywhere else.
        </p>

        {!token ? (
          <p className="mt-6 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Missing or invalid reset token. Request a new link from the{' '}
            <Link href="/forgot-password" className="text-primary hover:underline">
              forgot password
            </Link>{' '}
            page.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="pl-9"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="pl-9"
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <GraduationCap className="h-4 w-4" />
              Update password
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
