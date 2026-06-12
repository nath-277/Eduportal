'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, Users } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';

interface CreateCommunityForm {
  name: string;
  displayName: string;
  description: string;
  isPrivate: boolean;
}

export function CreateCommunityRequestSheet({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCommunityForm>({
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
      isPrivate: false,
    },
  });

  const isPrivate = watch('isPrivate');

  const requestMutation = useMutation({
    mutationFn: async (data: CreateCommunityForm) => {
      return api.post('/communities/request', data);
    },
    onSuccess: () => {
      toast.success('Community request submitted successfully! Pending admin approval.');
      reset();
      qc.invalidateQueries({ queryKey: ['community-requests'] });
      setOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    },
  });

  const onSubmit = (data: CreateCommunityForm) => {
    // format name: only lowercase, numbers, hyphens
    const formattedName = data.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');

    if (!formattedName) {
      toast.error('Community name must contain letters, numbers, or hyphens');
      return;
    }

    requestMutation.mutate({
      ...data,
      name: formattedName,
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            Start a community
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Start a Community
          </SheetTitle>
          <SheetDescription>
            Submit a request to create a new forum community. Admins will review your request.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-6">
          <div className="space-y-1.5">
            <Label htmlFor="comm-displayName">Community Name (Display)</Label>
            <Input
              id="comm-displayName"
              placeholder="e.g. Study Group CSC"
              {...register('displayName', {
                required: 'Display name is required',
                minLength: { value: 3, message: 'Minimum 3 characters' },
                maxLength: { value: 50, message: 'Maximum 50 characters' },
              })}
              onChange={(e) => {
                setValue('displayName', e.target.value);
                // Auto-fill slug name
                const slug = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '-')
                  .replace(/-+/g, '-');
                setValue('name', slug);
              }}
            />
            {errors.displayName && (
              <p className="text-xs text-destructive">{errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comm-name">Community Slug (URL path)</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground select-none">r/</span>
              <Input
                id="comm-name"
                placeholder="e.g. study-group-csc"
                {...register('name', {
                  required: 'Slug name is required',
                  pattern: {
                    value: /^[a-z0-9-]+$/,
                    message: 'Only lowercase letters, numbers, and hyphens allowed',
                  },
                })}
              />
            </div>
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comm-description">Description</Label>
            <Textarea
              id="comm-description"
              placeholder="Tell others what this community is about..."
              rows={4}
              {...register('description', {
                maxLength: { value: 500, message: 'Maximum 500 characters' },
              })}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex items-start space-x-3 rounded-lg border p-4 shadow-sm bg-muted/20">
            <Checkbox
              id="comm-isPrivate"
              checked={isPrivate}
              onCheckedChange={(checked) => setValue('isPrivate', !!checked)}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="comm-isPrivate" className="text-sm font-medium cursor-pointer">
                Private Community
              </Label>
              <p className="text-xs text-muted-foreground">
                Only approved members can view posts and participate. Users must submit a screening questionnaire to join.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={requestMutation.isPending}>
              {requestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
