'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  Save,
  User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { StudentShell } from '@/components/layout/student-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiResponse, User } from '@eduportal/shared';

interface MeResponse {
  user: User;
}

const profileSchema = z.object({
  fullname: z.string().min(3, 'At least 3 characters').max(100),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Needs uppercase')
      .regex(/[a-z]/, 'Needs lowercase')
      .regex(/\d/, 'Needs a number'),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different',
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

function initials(fullname: string): string {
  return fullname
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function StudentProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUserStore = useAuthStore((s) => s.updateUser);
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => api.get<MeResponse>('/auth/me'),
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullname: user?.fullname ?? '' },
  });

  useEffect(() => {
    if (meQuery.data?.user.fullname) {
      profileForm.reset({ fullname: meQuery.data.user.fullname });
    }
  }, [meQuery.data?.user.fullname, profileForm]);

  const profileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      return api.get<ApiResponse<{ user: User }>>(`/users/${meQuery.data?.user.id}`)
        .then(async () => {
          return api.patch<{ user: User }>(`/users/${meQuery.data?.user.id}`, values);
        });
    },
    onSuccess: (data) => {
      updateUserStore({ fullname: data.user.fullname });
      toast.success('Profile updated');
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Update failed';
      toast.error(message);
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      return api.post<ApiResponse<null>>('/users/me/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
    },
    onSuccess: () => {
      toast.success('Password changed');
      passwordForm.reset();
      setPasswordOpen(false);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Could not change password';
      toast.error(message);
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !meQuery.data) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Pick an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const result = await api.patch<{ user: User; avatarUrl: string }>(
        `/users/${meQuery.data.user.id}/avatar`,
        { image: dataUrl },
      );
      updateUserStore({ avatarUrl: result.avatarUrl });
      toast.success('Avatar updated');
      qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Avatar upload failed';
      toast.error(message);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const liveUser = meQuery.data?.user ?? user;
  const isLoading = meQuery.isLoading && !liveUser;

  return (
    <StudentShell>
      <PageHeader
        title="Your profile"
        subtitle="Manage your photo, personal details, and account security."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-4 ring-background">
                  {liveUser?.avatarUrl && (
                    <AvatarImage src={liveUser.avatarUrl} alt={liveUser?.fullname ?? ''} />
                  )}
                  <AvatarFallback className="text-xl">
                    {initials(liveUser?.fullname ?? '?')}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-105 disabled:opacity-60"
                  aria-label="Change avatar"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-lg font-semibold">{liveUser?.fullname}</p>
                    {liveUser?.matricNumber && (
                      <p className="text-sm text-muted-foreground">
                        {liveUser.matricNumber}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {liveUser?.level && (
                      <Badge variant="secondary">{liveUser.level.replace('L', 'Level ')}</Badge>
                    )}
                    <Badge variant="outline">Student</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Academic summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SummaryRow label="Enrolled courses" value="—" />
              <SummaryRow label="Total credit units" value="—" />
              <SummaryRow label="CGPA" value="—" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={profileForm.handleSubmit((v) => profileMutation.mutate(v))}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="fullname">Full name</Label>
                    <div className="relative">
                      <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="fullname" className="pl-9" {...profileForm.register('fullname')} />
                    </div>
                    {profileForm.formState.errors.fullname && (
                      <p className="text-xs text-destructive">
                        {profileForm.formState.errors.fullname.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={liveUser?.email ?? ''} readOnly className="pl-9" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Matric number</Label>
                    <Input value={liveUser?.matricNumber ?? '—'} readOnly />
                  </div>

                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Input value={liveUser?.level?.replace('L', 'Level ') ?? '—'} readOnly />
                  </div>

                  <div className="space-y-2">
                    <Label>Programme</Label>
                    <Input value={liveUser?.programme?.name ?? '—'} readOnly />
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      Student
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={profileMutation.isPending}>
                    {profileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account security</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Password</p>
                <p className="text-xs text-muted-foreground">
                  Use a strong password you have not used on other sites.
                </p>
              </div>
              <Button variant="outline" onClick={() => setPasswordOpen(true)}>
                <KeyRound className="h-4 w-4" />
                Change password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change your password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new one. You will stay signed in.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={passwordForm.handleSubmit((v) => passwordMutation.mutate(v))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...passwordForm.register('currentPassword')}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register('newPassword')}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register('confirmPassword')}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPasswordOpen(false)}
                disabled={passwordMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </StudentShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
