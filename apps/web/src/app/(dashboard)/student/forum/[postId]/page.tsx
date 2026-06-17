'use client';

import { use, useEffect, useState } from 'react';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Heart,
  Loader2,
  MessageCircle,
  Pencil,
  Pin,
  Send,
  Tag as TagIcon,
  Trash2,
  User as UserIcon,
} from 'lucide-react';

import { StudentShell } from '@/components/layout/student-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@eduportal/shared';

interface Author {
  id: string;
  fullname: string;
  avatarUrl: string | null;
  role: UserRole;
}

interface ForumReply {
  id: string;
  body: string;
  likesCount: number;
  createdAt: string;
  author: Author;
}

interface ForumPostDetail {
  id: string;
  title: string;
  body: string;
  tags: string[];
  likesCount: number;
  views: number;
  isPinned: boolean;
  imageUrl?: string;
  createdAt: string;
  author: Author;
  replies: ForumReply[];
  community?: { id: string; name: string; displayName: string };
}

interface ReplyForm {
  body: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function formatTimeAgo(d: string): string {
  const ts = new Date(d).getTime();
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

function Reply({ reply, isOp }: { reply: ForumReply; isOp: boolean }) {
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        {reply.author.avatarUrl ? (
          <AvatarImage src={reply.author.avatarUrl} alt={reply.author.fullname} />
        ) : null}
        <AvatarFallback>{initials(reply.author.fullname)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{reply.author.fullname}</span>
          {isOp ? (
            <Badge variant="secondary" className="text-[10px]">
              <UserIcon className="mr-0.5 h-2.5 w-2.5" />
              Original poster
            </Badge>
          ) : null}
          {reply.author.role === 'LECTURER' ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px] hover:bg-emerald-500/10">
              Lecturer
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">· {formatTimeAgo(reply.createdAt)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{reply.body}</p>
      </div>
    </div>
  );
}

function PostDetailView({ postId }: { postId: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const postQuery = useQuery({
    queryKey: ['forum', 'post', postId],
    queryFn: async () => api.get<ForumPostDetail>(`/forum/posts/${postId}`),
    enabled: !!postId,
  });

  const [likes, setLikes] = useState(0);

  useEffect(() => {
    if (postQuery.data) setLikes(postQuery.data.likesCount);
  }, [postQuery.data?.id, postQuery.data?.likesCount]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      return api.patch<{ likesCount: number }>(`/forum/posts/${postId}/like`, {});
    },
    onSuccess: (data) => {
      setLikes(data.likesCount);
      qc.invalidateQueries({ queryKey: ['forum', 'post', postId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not update like');
    },
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ReplyForm>({
    defaultValues: { body: '' },
  });

  const replyBody = watch('body') ?? '';

  const replyMutation = useMutation({
    mutationFn: async (body: string) => {
      return api.post<ForumReply>(`/forum/posts/${postId}/replies`, { body });
    },
    onSuccess: () => {
      toast.success('Reply posted');
      reset();
      qc.invalidateQueries({ queryKey: ['forum', 'post', postId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not post reply');
    },
  });

  const post = postQuery.data;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState('');

  const startEditing = () => {
    if (post) {
      setEditTitle(post.title);
      setEditBody(post.body);
      setEditTags(post.tags.join(', '));
      setIsEditing(true);
    }
  };

  const editMutation = useMutation({
    mutationFn: async (payload: { title: string; body: string; tags: string[] }) => {
      return api.patch<{ post: ForumPostDetail }>(`/forum/posts/${postId}`, payload);
    },
    onSuccess: () => {
      toast.success('Post updated');
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ['forum', 'post', postId] });
      qc.invalidateQueries({ queryKey: ['forum', 'posts'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not update post');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return api.delete(`/forum/posts/${postId}`);
    },
    onSuccess: () => {
      toast.success('Post deleted');
      router.push('/student/forum');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not delete post');
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post?')) {
      deleteMutation.mutate();
    }
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    if (editBody.trim().length < 20) {
      toast.error('Body must be at least 20 characters');
      return;
    }
    editMutation.mutate({
      title: editTitle.trim(),
      body: editBody.trim(),
      tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  if (postQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (postQuery.error || !post) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Post not found"
        description="This post may have been removed or the link is incorrect."
        action={
          <Button onClick={() => router.push('/student/forum')} variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Back to forum
          </Button>
        }
      />
    );
  }

  const isLecturer = post.author.role === 'LECTURER';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/student/forum">
            <ArrowLeft className="h-4 w-4" />
            Back to forum
          </Link>
        </Button>
      </div>

      <PageHeader
        title={post.title}
        subtitle={
          <span>
            {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'} · {post.views} views
          </span>
        }
      />

      {/* Post body */}
      {isEditing ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Edit Post</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-title">Title</label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Post title"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-body">Body</label>
              <Textarea
                id="edit-body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Post content..."
                rows={6}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-tags">Tags (comma-separated)</label>
              <Input
                id="edit-tags"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="e.g. general, help"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={editMutation.isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={editMutation.isPending}>
                {editMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                {post.author.avatarUrl ? (
                  <AvatarImage src={post.author.avatarUrl} alt={post.author.fullname} />
                ) : null}
                <AvatarFallback>{initials(post.author.fullname)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
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
                    <span className="text-xs text-muted-foreground">· {formatTimeAgo(post.createdAt)}</span>
                  </div>
                  {user && (post.author.id === user.id || user.role === 'ADMIN') && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startEditing} aria-label="Edit post">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete} aria-label="Delete post">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {post.imageUrl ? (
                  <div className="my-4 overflow-hidden rounded-xl border border-border bg-muted/10">
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      width={800}
                      height={500}
                      sizes="(max-width: 768px) 100vw, 800px"
                      className="max-h-[500px] w-full object-contain"
                    />
                  </div>
                ) : null}
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{post.body}</div>

                {post.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        <TagIcon className="mr-0.5 h-2.5 w-2.5" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => likeMutation.mutate()}
                    disabled={likeMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 transition hover:border-rose-500 hover:text-rose-500"
                    aria-label="Like post"
                  >
                    <Heart className="h-3.5 w-3.5" />
                    <span>{likes}</span>
                  </button>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {post.replies.length}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Replies */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
        </h2>
        {post.replies.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No replies yet"
            description="Be the first to reply to this post."
          />
        ) : (
          <div className="space-y-3">
            {post.replies.map((reply) => (
              <Reply
                key={reply.id}
                reply={reply}
                isOp={reply.author.id === post.author.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reply compose */}
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={handleSubmit((values) => replyMutation.mutate(values.body.trim()))}
            className="space-y-3"
          >
            <Textarea
              placeholder="Write a reply..."
              rows={3}
              {...register('body', { required: 'Reply cannot be empty', minLength: { value: 2, message: 'At least 2 characters' } })}
              aria-invalid={!!errors.body}
            />
            {errors.body ? (
              <p className="text-xs text-destructive">{errors.body.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Replying as <span className="font-medium text-foreground">{user?.fullname}</span>
              </p>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={replyMutation.isPending || replyBody.trim().length < 2}
                className="gap-1.5"
              >
                {replyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Post reply
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ForumPostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = use(params);
  return (
    <StudentShell>
      <PostDetailView postId={postId} />
    </StudentShell>
  );
}
