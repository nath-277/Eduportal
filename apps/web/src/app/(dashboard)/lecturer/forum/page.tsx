'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
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

interface CreateForm {
  title: string;
  body: string;
  tags: string;
}

function CreatePostSheet({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [tagChips, setTagChips] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateForm>({
    defaultValues: { title: '', body: '', tags: '' },
  });

  const body = watch('body') ?? '';
  const title = watch('title') ?? '';

  const createMutation = useMutation({
    mutationFn: async (input: { title: string; body: string; tags: string[]; imageUrl?: string }) => {
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
      ]),
    );
    createMutation.mutate({
      title: values.title.trim(),
      body: values.body.trim(),
      tags,
      imageUrl: imagePreview ?? undefined,
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8"
          aria-label="Create post"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-3xl sm:max-w-lg sm:translate-x-[-50%] sm:left-1/2"
      >
        <SheetHeader>
          <SheetTitle>New discussion</SheetTitle>
          <SheetDescription>
            Ask a question, share a resource, or start a thread.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-6">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What's on your mind?"
              {...register('title', { required: 'Title is required', minLength: { value: 5, message: 'At least 5 characters' } })}
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
              {...register('body', { required: 'Body is required', minLength: { value: 20, message: 'At least 20 characters' } })}
              aria-invalid={!!errors.body}
            />
            {errors.body ? <p className="text-xs text-destructive">{errors.body.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label>Attach Image</Label>
            {imagePreview ? (
              <div className="relative mt-1 aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
                <img
                  src={imagePreview}
                  alt="Attachment preview"
                  className="h-full w-full object-cover"
                />
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
                <span className="text-[10px] text-muted-foreground/70">
                  PNG, JPG, GIF up to 5MB
                </span>
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
            <p className="text-xs text-muted-foreground">
              Or separate tags with commas in the field above.
            </p>
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const postsQuery = useQuery({
    queryKey: ['forum', 'posts', filter, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      const cat = CATEGORIES.find((c) => c.value === filter);
      if (cat?.tag) params.set('tag', cat.tag);
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('limit', '30');
      const data = await api.get<Paginated<ForumPost>>(`/forum/posts?${params.toString()}`);
      return data;
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch<{ likesCount: number }>(`/forum/posts/${id}/like`, {});
    },
    onSuccess: (data, id) => {
      qc.setQueryData<Paginated<ForumPost> | undefined>(
        ['forum', 'posts', filter, debouncedSearch],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((p) =>
              p.id === id ? { ...p, likesCount: data.likesCount } : p,
            ),
          };
        },
      );
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not update like');
    },
  });

  const posts = postsQuery.data?.data ?? [];

  return (
    <LecturerShell>
      <PageHeader
        title="Faculty discussions"
        subtitle={
          postsQuery.data
            ? `${postsQuery.data.total} ${postsQuery.data.total === 1 ? 'discussion' : 'discussions'}`
            : 'Loading discussions…'
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Main Feed */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="pl-9"
            />
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
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
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
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
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
                                {post.isPinned ? (
                                  <Badge variant="secondary" className="gap-1 text-[10px]">
                                    <Pin className="h-3 w-3" />
                                    Pinned
                                  </Badge>
                                ) : null}
                                <span className="text-xs text-muted-foreground">· {formatTimeAgo(post.createdAt)}</span>
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

        {/* Right Sidebar */}
        <div className="hidden lg:block lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">About Academy Forum</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Welcome to the Eduportal Academy Forum! Start conversations, ask questions, share academic resources, and interact with lecturers and peers.
              </p>
              <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="font-medium text-foreground">Academic & Social</span>
                </div>
                <div className="flex justify-between">
                  <span>Audience:</span>
                  <span className="font-medium text-foreground">Faculty & Students</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Popular Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {['exam-prep', 'resource', 'question', 'general', 'announcement', 'registration', 'maths', 'programming', 'study-group'].map((t) => (
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
      </div>

      <CreatePostSheet
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ['forum', 'posts'] });
        }}
      />
    </LecturerShell>
  );
}
