'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HelpCircle, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

interface Question {
  id: string;
  question: string;
}

interface JoinPrivateCommunityModalProps {
  communityId: string;
  communityName: string;
  questions: Question[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function JoinPrivateCommunityModal({
  communityId,
  communityName,
  questions,
  trigger,
  onSuccess,
}: JoinPrivateCommunityModalProps) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const joinMutation = useMutation({
    mutationFn: async (payload: { answers: Array<{ questionId: string; questionText: string; answer: string }> }) => {
      return api.post(`/communities/${communityId}/request-join`, payload);
    },
    onSuccess: () => {
      toast.success('Your join request has been submitted to the moderators!');
      qc.invalidateQueries({ queryKey: ['community', communityId] });
      qc.invalidateQueries({ queryKey: ['community', communityName] });
      if (onSuccess) onSuccess();
      setOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    },
  });

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Map questions to payload
    const formattedAnswers = questions.map((q) => ({
      questionId: q.id,
      questionText: q.question,
      answer: (answers[q.id] || '').trim(),
    }));

    // Check if any answers are empty
    if (formattedAnswers.some((ans) => !ans.answer)) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    joinMutation.mutate({ answers: formattedAnswers });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full">
            Request to Join
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Membership Questionnaire
          </DialogTitle>
          <DialogDescription>
            This community is private. Please answer the screening questions set by the moderators to request access.
          </DialogDescription>
        </DialogHeader>

        {questions.length === 0 ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground text-center">
              No questionnaire is set for this community. You can submit a blank request to join.
            </p>
            <div className="flex justify-end gap-2 border-t pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button onClick={() => joinMutation.mutate({ answers: [] })} disabled={joinMutation.isPending}>
                {joinMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1">
              {questions.map((q, idx) => (
                <div key={q.id} className="space-y-1.5">
                  <Label htmlFor={`q-${q.id}`} className="text-sm font-medium leading-relaxed">
                    {idx + 1}. {q.question}
                  </Label>
                  <Textarea
                    id={`q-${q.id}`}
                    placeholder="Type your answer here..."
                    rows={3}
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    required
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={joinMutation.isPending}>
                {joinMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Answers
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
