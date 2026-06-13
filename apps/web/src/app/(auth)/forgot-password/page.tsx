'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, Mail, Send } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', values);
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
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
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary overflow-hidden">
          <Logo className="h-10 w-10 p-1.5" iconClassName="h-5 w-5" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the email on your account and we will send instructions to reset it.
        </p>

        {submitted ? (
          <div className="mt-8 space-y-4">
            <p className="rounded-lg border bg-muted/40 p-4 text-sm">
              If an account exists for that email, reset instructions have been sent.
              <br />
              <span className="mt-2 inline-block text-xs text-muted-foreground">
                Dev mode: check the API server console for the reset link.
              </span>
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  placeholder="you@department.edu"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send reset link
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
