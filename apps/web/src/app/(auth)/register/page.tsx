'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';

import { api } from '@/lib/api';
import type { Department, UserRole } from '@eduportal/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type AccountType = Extract<UserRole, 'STUDENT' | 'LECTURER'>;

const accountTypes: Array<{
  role: AccountType;
  title: string;
  description: string;
  icon: typeof GraduationCap;
}> = [
  {
    role: 'STUDENT',
    title: "I'm a Student",
    description: 'Register for courses, view results, and join the discussion forum.',
    icon: GraduationCap,
  },
  {
    role: 'LECTURER',
    title: "I'm a Lecturer",
    description: 'Manage assigned courses, upload results, and post announcements.',
    icon: UserIcon,
  },
];

const personalSchema = z.object({
  fullname: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  departmentId: z.string().min(1, 'Department is required'),
  level: z.string().min(1, 'Level is required'),
  matricNumber: z.string().min(3, 'Matric number is required'),
  staffId: z.string().optional(),
});

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Needs an uppercase letter')
      .regex(/[a-z]/, 'Needs a lowercase letter')
      .regex(/\d/, 'Needs a number'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
    terms: z.boolean(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((d) => d.terms === true, {
    path: ['terms'],
    message: 'You must accept the terms',
  });

type PersonalValues = z.infer<typeof personalSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

type FormState = Partial<PersonalValues & PasswordValues & { role?: AccountType }>;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [state, setState] = useState<FormState>({});
  const [submitting, setSubmitting] = useState(false);

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => {
      const data = await api.get<Department[]>('/departments');
      return data;
    },
  });

  const settingsQuery = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: async () => {
      return api.get<{
        portalName: string;
        displayName: string;
        allowedEmailDomain: string;
      }>('/settings');
    },
  });
  const allowedEmailDomain = settingsQuery.data?.allowedEmailDomain;

  const goToPersonal = (role: AccountType) => {
    setState((s) => ({ ...s, role }));
    setStep(1);
  };

  const submitPersonal = (data: PersonalValues) => {
    setState((s) => ({ ...s, ...data }));
    setStep(2);
  };

  const submitFinal = (data: PasswordValues) => {
    void doRegister({ ...state, ...data });
  };

  const doRegister = async (data: FormState) => {
    if (!data.role) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        fullname: data.fullname,
        email: data.email,
        password: data.password,
        role: data.role,
        departmentId: data.departmentId,
      };
      if (data.role === 'STUDENT') {
        payload.level = `L${data.level}`;
        payload.matricNumber = data.matricNumber;
      } else {
        payload.staffId = data.staffId ?? null;
      }
      await api.post('/auth/register', payload);
      toast.success('Account created! Please sign in.');
      router.push('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create account';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="text-sm text-muted-foreground">
          Step {step + 1} of 3
        </div>
      </div>

      <StepIndicator step={step} />

      <div className="mt-10 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              <AccountTypeStep
                onSelect={goToPersonal}
                portalName={settingsQuery.data?.portalName || 'EduPortal'}
              />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              <PersonalStep
                role={state.role ?? 'STUDENT'}
                defaults={state}
                departments={departmentsQuery.data ?? []}
                loadingDepartments={departmentsQuery.isLoading}
                allowedEmailDomain={allowedEmailDomain}
                onBack={() => setStep(0)}
                onContinue={submitPersonal}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              <PasswordStep
                onBack={() => setStep(1)}
                onSubmit={submitFinal}
                submitting={submitting}
                portalName={settingsQuery.data?.portalName || 'EduPortal'}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: 0 | 1 | 2 }) {
  const labels = ['Account type', 'Personal', 'Password'];
  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {labels.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div
              className={[
                'grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-medium transition',
                done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : active
                    ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground',
              ].join(' ')}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={[
                'hidden text-sm sm:inline',
                active ? 'text-foreground' : 'text-muted-foreground',
              ].join(' ')}
            >
              {label}
            </span>
            {i < labels.length - 1 && (
              <div
                className={[
                  'h-px flex-1 transition',
                  done ? 'bg-primary' : 'bg-border',
                ].join(' ')}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function AccountTypeStep({
  onSelect,
  portalName = 'EduPortal',
}: {
  onSelect: (role: AccountType) => void;
  portalName?: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">How will you use {portalName}?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick the role that best describes you. You can always ask an admin to update it later.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {accountTypes.map((opt) => (
          <button
            key={opt.role}
            type="button"
            onClick={() => onSelect(opt.role)}
            className="group flex flex-col items-start gap-3 rounded-2xl border bg-card p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <opt.icon className="h-6 w-6" />
            </span>
            <span className="text-lg font-semibold">{opt.title}</span>
            <span className="text-sm text-muted-foreground">{opt.description}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Continue
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PersonalStep({
  role,
  defaults,
  departments,
  loadingDepartments,
  allowedEmailDomain,
  onBack,
  onContinue,
}: {
  role: AccountType;
  defaults: FormState;
  departments: Department[];
  loadingDepartments: boolean;
  allowedEmailDomain?: string;
  onBack: () => void;
  onContinue: (data: PersonalValues) => void;
}) {
  const isStudent = role === 'STUDENT';

  const personalSchema = useMemo(() => {
    return z.object({
      fullname: z.string().min(2, 'Full name is required'),
      email: z.string().email('Enter a valid email').refine((email) => {
        if (!allowedEmailDomain) return true;
        return email.toLowerCase().endsWith(`@${allowedEmailDomain.toLowerCase()}`);
      }, {
        message: allowedEmailDomain ? `Email must end with @${allowedEmailDomain}` : 'Invalid email domain',
      }),
      departmentId: z.string().min(1, 'Department is required'),
      level: z.string(),
      matricNumber: z.string(),
      staffId: z.string().optional(),
    }).refine((data) => {
      if (isStudent && !data.level) return false;
      return true;
    }, {
      path: ['level'],
      message: 'Level is required',
    }).refine((data) => {
      if (isStudent && (!data.matricNumber || data.matricNumber.length < 3)) return false;
      return true;
    }, {
      path: ['matricNumber'],
      message: 'Matric number is required (at least 3 characters)',
    });
  }, [allowedEmailDomain, isStudent]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PersonalValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(personalSchema) as any,
    defaultValues: {
      fullname: defaults.fullname ?? '',
      email: defaults.email ?? '',
      departmentId: defaults.departmentId ?? '',
      level: defaults.level ?? '',
      matricNumber: defaults.matricNumber ?? '',
      staffId: defaults.staffId ?? '',
    },
  });

  const departmentId = watch('departmentId');
  const level = watch('level') ?? '';

  return (
    <form onSubmit={handleSubmit(onContinue)} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tell us about yourself</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We use this to set up your profile and connect you with the right department.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullname">Full name</Label>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="fullname" className="pl-9" {...register('fullname')} />
          </div>
          {errors.fullname && (
            <p className="text-xs text-destructive">{errors.fullname.message}</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" className="pl-9" {...register('email')} />
          </div>
          {allowedEmailDomain && (
            <p className="text-xs text-muted-foreground">
              Please register using your school email ending in <span className="font-semibold text-primary">@{allowedEmailDomain}</span>.
            </p>
          )}
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Department</Label>
          <Select
            value={departmentId}
            onValueChange={(v) => setValue('departmentId', v, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={loadingDepartments ? 'Loading…' : 'Select your department'}
              />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.departmentId && (
            <p className="text-xs text-destructive">{errors.departmentId.message}</p>
          )}
        </div>

        {isStudent ? (
          <>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={level}
                onValueChange={(v: string) =>
                  setValue('level', v, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {[100, 200, 300, 400, 500].map((l) => (
                    <SelectItem key={l} value={String(l)}>
                      {l} level
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.level && (
                <p className="text-xs text-destructive">{errors.level.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="matricNumber">Matric number</Label>
              <Input id="matricNumber" placeholder="CSC/2021/001" {...register('matricNumber')} />
              {errors.matricNumber && (
                <p className="text-xs text-destructive">{errors.matricNumber.message}</p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="staffId">Staff ID (optional)</Label>
            <Input id="staffId" placeholder="STF001" {...register('staffId')} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button type="submit">
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function PasswordStep({
  onBack,
  onSubmit,
  submitting,
  portalName = 'EduPortal',
}: {
  onBack: () => void;
  onSubmit: (data: PasswordValues) => void;
  submitting: boolean;
  portalName?: string;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '', terms: false },
  });

  const password = watch('password') ?? '';
  const terms = watch('terms');

  const strength = scorePassword(password);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Secure your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a strong password. You will use it to sign in to {portalName}.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
          <StrengthMeter score={strength} />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
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

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={terms}
            onCheckedChange={(v) =>
              setValue('terms', v === true, { shouldValidate: true })
            }
            className="mt-0.5"
          />
          <span className="text-muted-foreground">
            I agree to the{' '}
            <Link href="#" className="text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.terms && (
          <p className="-mt-3 text-xs text-destructive">{errors.terms.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <Sparkles className="h-4 w-4" />
          Create account
        </Button>
      </div>
    </form>
  );
}

function scorePassword(p: string): number {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s += 1;
  if (/[A-Z]/.test(p)) s += 1;
  if (/[a-z]/.test(p)) s += 1;
  if (/\d/.test(p)) s += 1;
  if (/[^A-Za-z0-9]/.test(p)) s += 1;
  return Math.min(4, s);
}

function StrengthMeter({ score }: { score: number }) {
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = [
    'bg-destructive',
    'bg-destructive',
    'bg-amber-500',
    'bg-amber-500',
    'bg-emerald-500',
  ];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={[
              'h-1.5 flex-1 rounded-full transition',
              i < score ? colors[score] : 'bg-muted',
            ].join(' ')}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[score]}</p>
    </div>
  );
}
