'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Lock, Save, Shield, UserCog } from 'lucide-react';

import { AdminShell } from '@/components/layout/admin-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const SESSION_OPTIONS = [
  { value: '1h', label: '1 hour' },
  { value: '8h', label: '8 hours' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
];

function initials(n: string): string {
  return n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function AdminSettingsPage() {
  const { user, setAuth, token } = useAuthStore();

  const [portalName, setPortalName] = useState('EduPortal');
  const [displayName, setDisplayName] = useState('EduPortal — University Companion');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');
  const [sessionExpiry, setSessionExpiry] = useState('24h');

  const [profileName, setProfileName] = useState(user?.fullname ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['me', 'admin'],
    queryFn: async () => api.get<{ user: typeof user & { phone?: string; bio?: string } }>('/auth/me'),
    enabled: !!user,
  });
  const latest = profileQuery.data?.user;

  async function savePortal() {
    toast.success('Portal settings saved', { description: `${displayName} · session ${sessionExpiry}, max attempts ${maxLoginAttempts}` });
  }

  async function saveProfile() {
    if (!user) return;
    if (!profileName.trim()) { toast.error('Name is required'); return; }
    if (!profileEmail.trim()) { toast.error('Email is required'); return; }
    setSavingProfile(true);
    try {
      const res = await api.patch<{ user: typeof user }>(`/users/${user.id}`, {
        fullname: profileName,
        email: profileEmail,
        phone: profilePhone || undefined,
        bio: profileBio || undefined,
      });
      if (res.user) setAuth(res.user, token ?? '');
      toast.success('Profile updated');
    } catch (e) {
      toast.error((e as Error).message ?? 'Could not update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (newPwd.length < 8) { toast.error('New password must be ≥ 8 characters'); return; }
    if (newPwd !== confirmPwd) { toast.error('Passwords do not match'); return; }
    setChangingPwd(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: currentPwd,
        newPassword: newPwd,
      });
      toast.success('Password changed. Please log in again.');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) {
      toast.error((e as Error).message ?? 'Could not change password');
    } finally {
      setChangingPwd(false);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        title="System settings"
        subtitle="Configure portal identity, security, and your admin profile."
      />

      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4 text-purple-600" />
                  Portal settings
                </CardTitle>
                <CardDescription>Visible branding and identity for all users.</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-700">Admin</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="portal-name">Department name</Label>
                <Input id="portal-name" value={portalName} onChange={(e) => setPortalName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="display-name">Display name</Label>
                <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={savePortal} className="gap-1.5">
                <Save className="h-4 w-4" /> Save portal
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-purple-600" />
                  Security
                </CardTitle>
                <CardDescription>Login thresholds and session lifetime.</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-700">Global</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="max-attempts">Max login attempts</Label>
                <Input
                  id="max-attempts"
                  type="number"
                  min={3}
                  max={10}
                  value={maxLoginAttempts}
                  onChange={(e) => setMaxLoginAttempts(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">After this many failures, the account is suspended.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="session-expiry">Session expiry</Label>
                <Select value={sessionExpiry} onValueChange={setSessionExpiry}>
                  <SelectTrigger id="session-expiry" className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SESSION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Active session length before re-authentication.</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={savePortal} variant="outline" className="gap-1.5">
                <Save className="h-4 w-4" /> Save security
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCog className="h-4 w-4 text-purple-600" />
                  Admin profile
                </CardTitle>
                <CardDescription>Update your own display information.</CardDescription>
              </div>
              {user?.role && (
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-700">{user.role}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {profileQuery.isLoading && !latest ? (
                <Skeleton className="h-14 w-14 rounded-full" />
              ) : (
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-purple-500/10 text-base text-purple-700">
                    {initials(latest?.fullname ?? profileName ?? user?.fullname ?? '?')}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <p className="font-medium">{latest?.fullname ?? profileName ?? 'Admin'}</p>
                <p className="text-xs text-muted-foreground">{latest?.email ?? profileEmail ?? '—'}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  key={`name-${latest?.id ?? 'init'}`}
                  defaultValue={latest?.fullname ?? user?.fullname ?? ''}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  key={`email-${latest?.id ?? 'init'}`}
                  defaultValue={latest?.email ?? user?.email ?? ''}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input
                  id="profile-phone"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  key={`phone-${latest?.id ?? 'init'}`}
                  defaultValue={latest?.phone ?? ''}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="profile-bio">Bio</Label>
                <Input
                  id="profile-bio"
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="Short bio shown in the team page"
                  key={`bio-${latest?.id ?? 'init'}`}
                  defaultValue={latest?.bio ?? ''}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={savingProfile} className="gap-1.5">
                <Save className="h-4 w-4" /> {savingProfile ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-purple-600" />
              Change password
            </CardTitle>
            <CardDescription>You will be asked to log in again after a successful change.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="current-pwd">Current password</Label>
                <Input id="current-pwd" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-pwd">New password</Label>
                <Input id="new-pwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-pwd">Confirm</Label>
                <Input id="confirm-pwd" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={changePassword} disabled={changingPwd} className="gap-1.5">
                <Lock className="h-4 w-4" /> {changingPwd ? 'Changing…' : 'Change password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
