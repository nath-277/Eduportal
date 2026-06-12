'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Menu,
  Info,
  TrendingUp,
  Home,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Send,
  Tag as TagIcon,
  X,
} from 'lucide-react';

import { LecturerShell } from '@/components/layout/lecturer-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@eduportal/shared';

// Forum Components
import { CreateCommunityRequestSheet } from '@/components/forum/create-community-request-sheet';
import { JoinPrivateCommunityModal } from '@/components/forum/join-private-community-modal';
import { ModeratorModal } from '@/components/forum/moderator-modal';
import { AdminRequestsModal } from '@/components/forum/admin-requests-modal';

interface ForumPost {
  id: string;
  title: string;
  body: string;
  tags: string[];
  likesCount: number;
  isPinned: boolean;
  replyCount: number;
  imageUrl?: string;
  createdAt: string;
  author: { id: string; fullname: string; avatarUrl: string | null; role: UserRole };
  community?: { id: string; name: string; displayName: string };
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type CategoryFilter = 'ALL' | 'questions' | 'resources' | 'general' | 'announcements';

const CATEGORIES: Array<{ value: CategoryFilter; label: string; tag?: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'questions', label: 'Questions', tag: 'question' },
  { value: 'resources', label: 'Resources', tag: 'resource' },
  { value: 'general', label: 'General', tag: 'general' },
  { value: 'announcements', label: 'Announcements', tag: 'announcement' },
];

function formatTimeAgo(d: string): string {
  const ts = new Date(d).getTime();
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function getCommunityColor(name: string) {
  const colors = [
    'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

interface CommunityItem {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isPrivate: boolean;
  isSystem: boolean;
  role: 'MEMBER' | 'MODERATOR';
  memberCount: number;
  createdAt: string;
}

interface DiscoverCommunityItem {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  memberCount: number;
  createdAt: string;
}

interface CommunityDetail {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isPrivate: boolean;
  isSystem: boolean;
  level: string | null;
  departmentId: string | null;
  creatorId: string | null;
  memberRole: 'MEMBER' | 'MODERATOR' | null;
  isMember: boolean;
  hasPendingRequest: boolean;
  memberCount: number;
  joinQuestions: Array<{ id: string; question: string }>;
  createdAt: string;
  updatedAt: string;
}

interface CreateForm {
  title: string;
  body: string;
  tags: string;
  communityId: string;
}

function CreatePostSheet({
  open,
  setOpen,
  defaultCommunityId,
  onCreated,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  defaultCommunityId?: string;
  onCreated: () => void;
}) {
  const [tagChips, setTagChips] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateForm>({
    defaultValues: { title: '', body: '', tags: '', communityId: defaultCommunityId ?? '' },
  });

  useEffect(() => {
    if (open) {
      setValue('communityId', defaultCommunityId ?? '');
    }
  }, [open, defaultCommunityId, setValue]);

  const body = watch('body') ?? '';
  const title = watch('title') ?? '';

  const { data: joinedCommunities = [] } = useQuery({
    queryKey: ['joined-communities'],
    queryFn: async () => api.get<CommunityItem[]>('/communities'),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (input: {
      title: string;
      body: string;
      tags: string[];
      imageUrl?: string;
      communityId?: string;
    }) => {
      return api.post<ForumPost>('/forum/posts', input);
    },
    onSuccess: () => {
      toast.success('Post published');
      onCreated();
      setOpen(false);
      reset();
      setTagChips([]);
      setTagInput('');
      setImagePreview(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not publish post');
    },
  });

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImagePreview(null);
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!t) return;
    if (tagChips.includes(t)) {
      setTagInput('');
      return;
    }
    setTagChips([...tagChips, t]);
    setTagInput('');
  }

  function removeTag(t: string) {
    setTagChips(tagChips.filter((x) => x !== t));
  }

  function onSubmit(values: CreateForm) {
    const tags = Array.from(
      new Set([
        ...tagChips,
        ...values.tags
          .split(',')
          .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
          .filter(Boolean),
      ])
    );
    createMutation.mutate({
      title: values.title.trim(),
      body: values.body.trim(),
      tags,
      imageUrl: imagePreview ?? undefined,
      communityId: values.communityId || undefined,
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-3xl sm:max-w-lg sm:translate-x-[-50%] sm:left-1/2"
      >
        <SheetHeader>
          <SheetTitle>New discussion</SheetTitle>
          <SheetDescription>Ask a question, share a resource, or start a thread.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-6">
          <div className="space-y-1.5">
            <Label htmlFor="post-community">Post to Community</Label>
            <select
              id="post-community"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('communityId')}
            >
              <option value="">General (Global Feed)</option>
              {joinedCommunities.map((c) => (
                <option key={c.id} value={c.id}>
                  r/{c.name} - {c.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What's on your mind?"
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 5, message: 'At least 5 characters' },
              })}
              aria-invalid={!!errors.title}
            />
            {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">
              Body <span className="text-xs text-muted-foreground">({body.length} chars, min 20)</span>
            </Label>
            <Textarea
              id="body"
              rows={5}
              placeholder="Share the details..."
              {...register('body', {
                required: 'Body is required',
                minLength: { value: 20, message: 'At least 20 characters' },
              })}
              aria-invalid={!!errors.body}
            />
            {errors.body ? <p className="text-xs text-destructive">{errors.body.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label>Attach Image</Label>
            {imagePreview ? (
              <div className="relative mt-1 aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
                <img src={imagePreview} alt="Attachment preview" className="h-full w-full object-cover" />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute right-2 top-2 h-7 w-7 rounded-full shadow-md hover:scale-105 active:scale-95 transition"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => document.getElementById('image-upload-lecturer')?.click()}
                className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border py-5 text-center transition hover:border-primary/50 hover:bg-muted/10"
              >
                <div className="rounded-full bg-muted p-2 group-hover:bg-primary/10 group-hover:text-primary transition">
                  <ImageIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition" />
                </div>
                <span className="mt-2 text-xs font-medium text-muted-foreground group-hover:text-primary transition">
                  Click to upload an image
                </span>
                <span className="text-[10px] text-muted-foreground/70">PNG, JPG, GIF up to 5MB</span>
                <input
                  id="image-upload-lecturer"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Type a tag and press Enter"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            {tagChips.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tagChips.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    <TagIcon className="h-3 w-3" />
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      aria-label={`Remove ${t}`}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">Or separate tags with commas in the field above.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={createMutation.isPending || !title.trim() || body.length < 20}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Post
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function LecturerForumPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<CategoryFilter>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCommunityId, setActiveCommunityId] = useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Query: Joined Communities
  const joinedQuery = useQuery({
    queryKey: ['joined-communities'],
    queryFn: async () => api.get<CommunityItem[]>('/communities'),
  });

  // Query: Discoverable Communities
  const discoverQuery = useQuery({
    queryKey: ['discover-communities'],
    queryFn: async () => api.get<DiscoverCommunityItem[]>('/communities/discover'),
  });

  // Query: Active Community Details
  const activeCommunityQuery = useQuery({
    queryKey: ['community', activeCommunityId],
    queryFn: async () => api.get<CommunityDetail>(`/communities/${activeCommunityId}`),
    enabled: !!activeCommunityId && activeCommunityId !== 'popular',
  });

  // Query: Posts Feed
  const postsQuery = useQuery({
    queryKey: ['forum', 'posts', activeCommunityId, filter, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      const cat = CATEGORIES.find((c) => c.value === filter);
      if (cat?.tag) params.set('tag', cat.tag);
      if (debouncedSearch) params.set('search', debouncedSearch);

      if (activeCommunityId === 'popular') {
        params.set('popular', 'true');
      } else if (activeCommunityId) {
        params.set('communityId', activeCommunityId);
      }

      params.set('limit', '30');
      const data = await api.get<Paginated<ForumPost>>(`/forum/posts?${params.toString()}`);
      return data;
    },
  });

  // Mutation: Join Public Community
  const joinMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/communities/${id}/join`, {}),
    onSuccess: () => {
      toast.success('Joined community successfully!');
      qc.invalidateQueries({ queryKey: ['joined-communities'] });
      qc.invalidateQueries({ queryKey: ['discover-communities'] });
      qc.invalidateQueries({ queryKey: ['forum', 'posts'] });
      if (activeCommunityId) {
        qc.invalidateQueries({ queryKey: ['community', activeCommunityId] });
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to join');
    },
  });

  // Mutation: Leave Community
  const leaveMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/communities/${id}/leave`, {}),
    onSuccess: () => {
      toast.success('Left community successfully.');
      qc.invalidateQueries({ queryKey: ['joined-communities'] });
      qc.invalidateQueries({ queryKey: ['discover-communities'] });
      qc.invalidateQueries({ queryKey: ['forum', 'posts'] });
      setActiveCommunityId('');
      setFilter('ALL');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to leave');
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch<{ likesCount: number }>(`/forum/posts/${id}/like`, {});
    },
    onSuccess: (data, id) => {
      qc.setQueryData<Paginated<ForumPost> | undefined>(
        ['forum', 'posts', activeCommunityId, filter, debouncedSearch],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((p) => (p.id === id ? { ...p, likesCount: data.likesCount } : p)),
          };
        }
      );
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not update like');
    },
  });

  const joinedCommunities = joinedQuery.data ?? [];
  const discoverCommunities = discoverQuery.data ?? [];
  const posts = postsQuery.data?.data ?? [];

  // Left Sidebar Render Function
  const renderLeftSidebar = () => (
    <div className="space-y-5">
      <div className="space-y-1">
        <Button
          variant={!activeCommunityId ? 'secondary' : 'ghost'}
          className="w-full justify-start gap-2.5 h-10 px-3 font-semibold rounded-xl transition duration-200"
          onClick={() => {
            setActiveCommunityId('');
            setFilter('ALL');
          }}
        >
          <Home className="h-4.5 w-4.5 text-primary" />
          Home Feed
        </Button>
        <Button
          variant={activeCommunityId === 'popular' ? 'secondary' : 'ghost'}
          className="w-full justify-start gap-2.5 h-10 px-3 font-semibold rounded-xl transition duration-200"
          onClick={() => {
            setActiveCommunityId('popular');
            setFilter('ALL');
          }}
        >
          <TrendingUp className="h-4.5 w-4.5 text-primary" />
          Popular Feed
        </Button>
      </div>

      {user?.role === 'ADMIN' && (
        <div className="pt-2 border-t">
          <AdminRequestsModal />
        </div>
      )}

      <div className="pt-2 border-t space-y-2">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Communities
          </span>
          <CreateCommunityRequestSheet
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Start a community"
              >
                <Plus className="h-4 w-4" />
              </Button>
            }
          />
        </div>
        <div className="space-y-0.5">
          {joinedQuery.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-xl" />)
          ) : joinedCommunities.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-1 italic">No communities joined yet.</p>
          ) : (
            joinedCommunities.map((c) => {
              const isActive = activeCommunityId === c.id;
              return (
                <Button
                  key={c.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-start gap-2.5 h-9.5 px-3 text-sm font-medium rounded-xl transition duration-200"
                  onClick={() => {
                    setActiveCommunityId(c.id);
                    setFilter('ALL');
                  }}
                >
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-sm transition",
                    getCommunityColor(c.name)
                  )}>
                    {c.name[0].toUpperCase()}
                  </div>
                  <span className="truncate">r/{c.name}</span>
                </Button>
              );
            })
          )}
        </div>
      </div>

      <div className="pt-2 border-t space-y-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 block">
          Discover
        </span>
        <div className="space-y-1">
          {discoverQuery.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)
          ) : discoverCommunities.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-1 italic">No public communities to join.</p>
          ) : (
            discoverCommunities.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 p-1.5 px-3 rounded-xl hover:bg-muted/40 transition duration-200"
              >
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left text-sm truncate font-medium hover:underline focus:outline-none"
                  onClick={() => {
                    setActiveCommunityId(c.id);
                    setFilter('ALL');
                  }}
                >
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-sm",
                    getCommunityColor(c.name)
                  )}>
                    {c.name[0].toUpperCase()}
                  </div>
                  <span className="truncate">r/{c.name}</span>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs font-semibold shrink-0 rounded-lg shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition duration-200"
                  onClick={() => joinMutation.mutate(c.id)}
                  disabled={joinMutation.isPending}
                >
                  Join
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // Right Sidebar Render Function
  const renderRightSidebar = () => {
    if (activeCommunityId && activeCommunityId !== 'popular') {
      const community = activeCommunityQuery.data;
      if (activeCommunityQuery.isLoading) {
        return (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        );
      }
      if (!community) return null;

      const isMember = community.isMember;
      const isMod = community.memberRole === 'MODERATOR';

      return (
        <div className="space-y-4">
          <Card className="border border-border/80 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="font-bold text-base text-foreground">r/{community.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{community.displayName}</p>
              </div>

              {community.description && (
                <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-2.5 rounded-lg border">
                  {community.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs py-2.5 border-y">
                <span className="text-muted-foreground">Members:</span>
                <span className="font-semibold text-foreground">{community.memberCount || 1}</span>
              </div>

              <div className="space-y-2 pt-1">
                {isMember ? (
                  <>
                    {!community.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive border-destructive/20 hover:bg-destructive/10"
                        onClick={() => leaveMutation.mutate(community.id)}
                        disabled={leaveMutation.isPending}
                      >
                        Leave Community
                      </Button>
                    )}
                    {community.isSystem && (
                      <p className="text-[10px] text-center text-muted-foreground italic">
                        System community. Members are managed automatically.
                      </p>
                    )}
                  </>
                ) : community.isPrivate ? (
                  community.hasPendingRequest ? (
                    <Button className="w-full" disabled variant="outline">
                      Request Pending
                    </Button>
                  ) : (
                    <JoinPrivateCommunityModal
                      communityId={community.id}
                      communityName={community.name}
                      questions={community.joinQuestions || []}
                    />
                  )
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => joinMutation.mutate(community.id)}
                    disabled={joinMutation.isPending}
                  >
                    Join Community
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isMod && (
            <ModeratorModal
              communityId={community.id}
              communityName={community.name}
              initialQuestions={community.joinQuestions || []}
            />
          )}
        </div>
      );
    }

    // Default Right Sidebar (when viewing Home / Popular feed)
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">About Academy Forum</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Welcome to the Eduportal Academy Forum! Start conversations, ask questions, share academic
              resources, and interact with lecturers and peers.
            </p>
            <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="font-medium text-foreground">Academic & Social</span>
              </div>
              <div className="flex justify-between">
                <span>Audience:</span>
                <span className="font-medium text-foreground">Students & Faculty</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Popular Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                'exam-prep',
                'resource',
                'question',
                'general',
                'announcement',
                'registration',
                'maths',
                'programming',
                'study-group',
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSearch(t)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[10px] font-medium transition hover:border-primary/40 hover:text-primary"
                >
                  #{t}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Community Guidelines</h3>
            <ol className="list-decimal pl-4 text-xs text-muted-foreground space-y-1.5">
              <li>Be respectful to peers and staff.</li>
              <li>Keep discussions educational and academic.</li>
              <li>Maintain academic honesty (no sharing test answers).</li>
              <li>Use descriptive titles and tag your posts.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    );
  };

  const activeCommunity = activeCommunityQuery.data;

  return (
    <LecturerShell>
      <PageHeader
        title={
          activeCommunityId === 'popular'
            ? 'Popular Feed'
            : activeCommunity
            ? `r/${activeCommunity.name}`
            : 'Academic forum'
        }
        subtitle={
          postsQuery.data
            ? `${postsQuery.data.total} ${postsQuery.data.total === 1 ? 'discussion' : 'discussions'}`
            : 'Loading discussions…'
        }
      />

      {/* Main Grid: Responsive 3-Column Layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column (Navigation) - Hidden on Mobile */}
        <div className="hidden lg:block lg:col-span-1">
          {renderLeftSidebar()}
        </div>

        {/* Center Column (Feed) - 50% width on Desktop */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mobile Navigation and About Buttons */}
          <div className="flex items-center justify-between border-b pb-3 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4 mr-1.5" />
                  Communities
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] overflow-y-auto">
                {renderLeftSidebar()}
              </SheetContent>
            </Sheet>

            {activeCommunityId && activeCommunityId !== 'popular' && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info className="h-4 w-4 mr-1.5" />
                    About Community
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] overflow-y-auto">
                  {renderRightSidebar()}
                </SheetContent>
              </Sheet>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="pl-9 rounded-xl shadow-sm border-border/80"
            />
          </div>

          {/* Create Post Bar */}
          <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm hover:border-primary/20 transition duration-300">
            <Avatar className="h-9 w-9 shrink-0">
              {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullname} /> : null}
              <AvatarFallback>{initials(user?.fullname ?? '')}</AvatarFallback>
            </Avatar>
            <Input
              readOnly
              onClick={() => setIsCreateOpen(true)}
              placeholder="Create a new post..."
              className="h-10 cursor-pointer bg-muted/40 hover:bg-muted/60 border-transparent hover:border-muted-foreground/20 rounded-xl transition duration-200"
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl h-10 w-10 transition duration-200"
              onClick={() => setIsCreateOpen(true)}
              aria-label="Create post with image"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Category chips */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {CATEGORIES.map((cat) => {
              const active = filter === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFilter(cat.value)}
                  className={cn(
                    'shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Posts list */}
          <div className="space-y-3">
            {postsQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
            ) : posts.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No discussions yet"
                description={
                  filter === 'ALL' && !debouncedSearch
                    ? 'Be the first to start a conversation. Tap the + button below.'
                    : `No posts match ${filter !== 'ALL' ? `this category` : 'your search'}.`
                }
              />
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05 },
                  },
                }}
                className="space-y-3"
              >
                {posts.map((post) => {
                  const isAuthor = user?.id === post.author.id;
                  const isLecturer = post.author.role === 'LECTURER';
                  return (
                    <motion.div
                      key={post.id}
                      variants={{
                        hidden: { opacity: 0, y: 12 },
                        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } },
                      }}
                    >
                      <Card className="transition hover:border-primary/30 hover:shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              {post.author.avatarUrl ? (
                                <AvatarImage src={post.author.avatarUrl} alt={post.author.fullname} />
                              ) : null}
                              <AvatarFallback>{initials(post.author.fullname)}</AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">{post.author.fullname}</span>
                                {isLecturer ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px] hover:bg-emerald-500/10">
                                    Lecturer
                                  </Badge>
                                ) : null}
                                {post.community && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] bg-primary/5 text-primary border-primary/10"
                                  >
                                    r/{post.community.name}
                                  </Badge>
                                )}
                                {post.isPinned ? (
                                  <Badge variant="secondary" className="gap-1 text-[10px]">
                                    <Pin className="h-3 w-3" />
                                    Pinned
                                  </Badge>
                                ) : null}
                                <span className="text-xs text-muted-foreground">
                                  · {formatTimeAgo(post.createdAt)}
                                </span>
                              </div>

                              <Link href={`/lecturer/forum/${post.id}`} className="mt-1 block">
                                <h3 className="line-clamp-2 font-semibold leading-snug hover:underline">
                                  {post.title}
                                </h3>
                              </Link>
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>

                              {post.imageUrl ? (
                                <Link
                                  href={`/lecturer/forum/${post.id}`}
                                  className="mt-3 block overflow-hidden rounded-xl border border-border/60 bg-muted/10"
                                >
                                  <img
                                    src={post.imageUrl}
                                    alt={post.title}
                                    className="aspect-[21/9] w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                                    loading="lazy"
                                  />
                                </Link>
                              ) : null}

                              {post.tags.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {post.tags.slice(0, 5).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-[10px]">
                                      <TagIcon className="mr-0.5 h-2.5 w-2.5" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}

                              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.92 }}
                                  type="button"
                                  onClick={() => likeMutation.mutate(post.id)}
                                  disabled={likeMutation.isPending}
                                  className="inline-flex items-center gap-1 transition hover:text-rose-500 focus:outline-none"
                                  aria-label="Like"
                                >
                                  <motion.span
                                    initial={{ scale: 1 }}
                                    whileTap={{ scale: 1.4 }}
                                    transition={{ type: 'spring', stiffness: 450, damping: 15 }}
                                    className="flex items-center"
                                  >
                                    <Heart className="h-3.5 w-3.5" />
                                  </motion.span>
                                  <span>{post.likesCount}</span>
                                </motion.button>
                                <Link
                                  href={`/lecturer/forum/${post.id}`}
                                  className="inline-flex items-center gap-1 transition hover:text-foreground"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  <span>{post.replyCount}</span>
                                </Link>
                                <span>{isAuthor ? 'You posted' : formatTimeAgo(post.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Column (Sidebar) - Hidden on Mobile */}
        <div className="hidden lg:block lg:col-span-1">
          {renderRightSidebar()}
        </div>
      </div>

      <CreatePostSheet
        open={isCreateOpen}
        setOpen={setIsCreateOpen}
        defaultCommunityId={
          activeCommunityId && activeCommunityId !== 'popular' ? activeCommunityId : undefined
        }
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ['forum', 'posts'] });
        }}
      />

      {/* Floating Action Button for Mobile / Quick Access */}
      <Button
        size="icon"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8 hover:scale-105 active:scale-95 transition"
        onClick={() => setIsCreateOpen(true)}
        aria-label="Create post"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </LecturerShell>
  );
}
