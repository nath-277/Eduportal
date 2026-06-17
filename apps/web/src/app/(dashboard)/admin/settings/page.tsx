'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Lock, Save, Shield, UserCog, Building2, Globe, Sparkles, Laptop, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const qc = useQueryClient();
  const { user, setAuth, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'branding' | 'security' | 'profile' | 'password'>('branding');

  // Portal/Settings states
  const [portalName, setPortalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');
  const [sessionExpiry, setSessionExpiry] = useState('24h');
  const [allowedEmailDomain, setAllowedEmailDomain] = useState('');
  const [portalLogoUrl, setPortalLogoUrl] = useState<string | null>(null);
  const [portalLogo, setPortalLogo] = useState<string | undefined>(undefined);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Profile states
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password states
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['settings', 'admin'],
    queryFn: async () => api.get<{
      portalName: string;
      displayName: string;
      facultyName: string;
      maxLoginAttempts: number;
      sessionExpiry: string;
      allowedEmailDomain: string;
      portalLogoUrl: string | null;
    }>('/settings'),
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (settingsQuery.data) {
      setPortalName(settingsQuery.data.portalName || '');
      setDisplayName(settingsQuery.data.displayName || '');
      setFacultyName(settingsQuery.data.facultyName || 'Computing & Information Sciences');
      setMaxLoginAttempts(String(settingsQuery.data.maxLoginAttempts ?? '5'));
      setSessionExpiry(settingsQuery.data.sessionExpiry || '24h');
      setAllowedEmailDomain(settingsQuery.data.allowedEmailDomain || '');
      setPortalLogoUrl(settingsQuery.data.portalLogoUrl || null);
      setLogoPreview(settingsQuery.data.portalLogoUrl || null);
      setPortalLogo(undefined);
    }
  }, [settingsQuery.data]);

  const profileQuery = useQuery({
    queryKey: ['me', 'admin'],
    queryFn: async () => api.get<{ user: typeof user & { phone?: string; bio?: string } }>('/auth/me'),
    enabled: !!user,
  });

  useEffect(() => {
    if (profileQuery.data?.user) {
      setProfileName(profileQuery.data.user.fullname || '');
      setProfileEmail(profileQuery.data.user.email || '');
      setProfilePhone(profileQuery.data.user.phone || '');
      setProfileBio(profileQuery.data.user.bio || '');
    }
  }, [profileQuery.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const settingsMutation = useMutation({
    mutationFn: async (payload: {
      portalName: string;
      displayName: string;
      facultyName: string;
      maxLoginAttempts: number;
      sessionExpiry: string;
      allowedEmailDomain: string;
      portalLogo?: string;
      portalLogoUrl?: string | null;
    }) => api.patch('/settings', payload),
    onSuccess: () => {
      toast.success('System settings saved successfully');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Could not save settings'),
  });

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Pick an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2 MB');
      return;
    }
    setUploadingLogo(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      setPortalLogo(dataUrl);
      setLogoPreview(dataUrl);
      toast.success('Logo selected. Click Save Branding to apply.');
    } catch (err) {
      toast.error('Failed to read logo image file');
    } finally {
      setUploadingLogo(false);
    }
  };

  const clearLogo = () => {
    setPortalLogo(undefined);
    setPortalLogoUrl(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
    toast.success('Logo cleared. Click Save Branding to apply.');
  };

  async function savePortal() {
    if (!portalName.trim()) { toast.error('Portal name is required'); return; }
    if (!displayName.trim()) { toast.error('Display name is required'); return; }

    settingsMutation.mutate({
      portalName,
      displayName,
      facultyName,
      maxLoginAttempts: Number.parseInt(maxLoginAttempts, 10) || 5,
      sessionExpiry,
      allowedEmailDomain,
      portalLogo,
      portalLogoUrl,
    });
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
      toast.success('Profile updated successfully');
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
      await api.post('/users/me/change-password', {
        currentPassword: currentPwd,
        newPassword: newPwd,
      });
      toast.success('Password changed successfully');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) {
      toast.error((e as Error).message ?? 'Could not change password');
    } finally {
      setChangingPwd(false);
    }
  }

  const tabs = [
    { id: 'branding', label: 'Portal Identity', icon: Building2, desc: 'Customize system branding and visual identifiers.' },
    { id: 'security', label: 'Security & Domains', icon: Shield, desc: 'Restrict signups and set security limitations.' },
    { id: 'profile', label: 'Admin Profile', icon: UserCog, desc: 'Update your personal details and bio.' },
    { id: 'password', label: 'Authentication', icon: Lock, desc: 'Change your account security password.' },
  ] as const;

  return (
    <AdminShell>
      <PageHeader
        title="System Settings"
        subtitle="Manage portal parameters, registration guidelines, and security policies."
      />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Navigation Sidebar */}
        <div className="flex flex-col gap-2 lg:col-span-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition duration-200',
                  active
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                ].join(' ')}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate">{tab.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Form Content Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'branding' && (
                <Card className="border border-border/40 shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <Building2 className="h-5 w-5 text-primary" />
                          Portal Identity Settings
                        </CardTitle>
                        <CardDescription>Configure branding shown across the application headers and landing page.</CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">System</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {settingsQuery.isLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="portal-name">Portal Short Name</Label>
                            <Input
                              id="portal-name"
                              value={portalName}
                              onChange={(e) => setPortalName(e.target.value)}
                              placeholder="e.g. EduPortal"
                            />
                            <p className="text-[11px] text-muted-foreground">Used in sidebar and navigation links.</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="display-name">Portal Full Display Name</Label>
                            <Input
                              id="display-name"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder="e.g. EduPortal — University Companion"
                            />
                            <p className="text-[11px] text-muted-foreground">Used on login pages and emails.</p>
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="faculty-name">Default Faculty Name</Label>
                            <Input
                              id="faculty-name"
                              value={facultyName}
                              onChange={(e) => setFacultyName(e.target.value)}
                              placeholder="e.g. Computing &amp; Information Sciences"
                            />
                            <p className="text-[11px] text-muted-foreground">Default faculty name displayed in headers of printed documents.</p>
                          </div>
                        </div>

                        <div className="space-y-4 border-t pt-6">
                          <Label>Organization Branding Icon</Label>
                          <div className="flex flex-wrap items-center gap-6">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 overflow-hidden relative group/logo">
                              {logoPreview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={logoPreview}
                                  alt="Branding preview"
                                  className="h-full w-full object-contain p-1"
                                />
                              ) : (
                                <Building2 className="h-8 w-8 text-muted-foreground/60" />
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => logoInputRef.current?.click()}
                                  disabled={uploadingLogo}
                                  className="h-8 text-xs gap-1.5"
                                >
                                  Upload Icon
                                </Button>
                                {logoPreview && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearLogo}
                                    className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    Remove Icon
                                  </Button>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                PNG, JPG, SVG or ICO format. Max 2MB. Replaces all default icons and syncs the browser favicon.
                              </p>
                            </div>
                          </div>
                          <input
                            type="file"
                            ref={logoInputRef}
                            onChange={handleLogoChange}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>
                      </>
                    )}
                    <div className="flex justify-end border-t pt-4">
                      <Button onClick={savePortal} disabled={settingsMutation.isPending} className="gap-2">
                        <Save className="h-4 w-4" /> Save Branding
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'security' && (
                <Card className="border border-border/40 shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <Shield className="h-5 w-5 text-primary" />
                          Security & Email Domain Rules
                        </CardTitle>
                        <CardDescription>Configure registration security policy and session durations.</CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-rose-500/10 text-rose-700">Security</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {settingsQuery.isLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
                          <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-sm">School Email Domain Enforcement</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Enforces email validation on registration. If configured, users can only sign up if their email address ends with the specified domain. Keep empty to allow all email addresses.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="allowed-domain">Allowed Email Domain</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">@</span>
                            <Input
                              id="allowed-domain"
                              className="pl-7 font-mono"
                              value={allowedEmailDomain}
                              onChange={(e) => setAllowedEmailDomain(e.target.value)}
                              placeholder="e.g. eduportal.com"
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">Example domain: `eduportal.com` or `university.edu`.</p>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="max-attempts">Max Login Attempts</Label>
                            <Input
                              id="max-attempts"
                              type="number"
                              min={3}
                              max={10}
                              value={maxLoginAttempts}
                              onChange={(e) => setMaxLoginAttempts(e.target.value)}
                            />
                            <p className="text-[11px] text-muted-foreground">Accounts are temporarily locked after this many failures.</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="session-expiry">Session Timeout Limit</Label>
                            <Select value={sessionExpiry} onValueChange={setSessionExpiry}>
                              <SelectTrigger id="session-expiry" className="h-10"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {SESSION_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">Maximum login duration without user interaction.</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end border-t pt-4">
                      <Button onClick={savePortal} disabled={settingsMutation.isPending} className="gap-2">
                        <Save className="h-4 w-4" /> Save Security
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'profile' && (
                <Card className="border border-border/40 shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <UserCog className="h-5 w-5 text-primary" />
                          Administrator Profile
                        </CardTitle>
                        <CardDescription>Manage your administrative profile fields and visible identifiers.</CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">Profile</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                      {profileQuery.isLoading ? (
                        <Skeleton className="h-16 w-16 rounded-full" />
                      ) : (
                        <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                            {initials(profileName || user?.fullname || 'Admin')}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <h4 className="font-semibold text-base">{profileName || 'Administrator'}</h4>
                        <p className="text-xs text-muted-foreground">Admin Account</p>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="profile-name">Full Name</Label>
                        <Input
                          id="profile-name"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-email">Email Address</Label>
                        <Input
                          id="profile-email"
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="profile-phone">Phone Number (Optional)</Label>
                        <Input
                          id="profile-phone"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          placeholder="e.g. +1 (555) 000-0000"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="profile-bio">Administrative Bio</Label>
                        <Input
                          id="profile-bio"
                          value={profileBio}
                          onChange={(e) => setProfileBio(e.target.value)}
                          placeholder="Provide a brief bio describing your administrative role"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end border-t pt-4">
                      <Button onClick={saveProfile} disabled={savingProfile} className="gap-2">
                        <Save className="h-4 w-4" /> {savingProfile ? 'Saving...' : 'Save Profile'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'password' && (
                <Card className="border border-border/40 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <Lock className="h-5 w-5 text-primary" />
                      Update Administrator Password
                    </CardTitle>
                    <CardDescription>Ensure your account security by modifying your credential password periodically.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="current-pwd">Current Password</Label>
                        <Input
                          id="current-pwd"
                          type="password"
                          value={currentPwd}
                          onChange={(e) => setCurrentPwd(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-pwd">New Password</Label>
                        <Input
                          id="new-pwd"
                          type="password"
                          value={newPwd}
                          onChange={(e) => setNewPwd(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-pwd">Confirm New Password</Label>
                        <Input
                          id="confirm-pwd"
                          type="password"
                          value={confirmPwd}
                          onChange={(e) => setConfirmPwd(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end border-t pt-4">
                      <Button onClick={changePassword} disabled={changingPwd} className="gap-2">
                        <Lock className="h-4 w-4" /> {changingPwd ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AdminShell>
  );
}
