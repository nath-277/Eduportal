'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ClipboardList, Loader2, ShieldAlert, Trash2, Users, X } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';

interface JoinRequest {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    fullname: string;
    email: string;
    level: string | null;
    avatarUrl: string | null;
  };
  answers: Array<{
    id: string;
    questionText: string;
    answer: string;
  }>;
}

interface ModeratorModalProps {
  communityId: string;
  communityName: string;
  initialQuestions: Array<{ id: string; question: string }>;
  trigger?: React.ReactNode;
}

export function ModeratorModal({
  communityId,
  communityName,
  initialQuestions,
  trigger,
}: ModeratorModalProps) {
  const [open, setOpen] = useState(false);
  const [questionsList, setQuestionsList] = useState<string[]>(
    initialQuestions.map((q) => q.question)
  );
  const [newQuestionText, setNewQuestionText] = useState('');
  const qc = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ['join-requests', communityId],
    queryFn: async () => {
      return api.get<JoinRequest[]>(`/communities/${communityId}/join-requests`);
    },
    enabled: open,
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return api.post(`/communities/${communityId}/join-requests/${requestId}/approve`, {});
    },
    onSuccess: () => {
      toast.success('Member request approved!');
      qc.invalidateQueries({ queryKey: ['join-requests', communityId] });
      qc.invalidateQueries({ queryKey: ['community', communityId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to approve request');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return api.post(`/communities/${communityId}/join-requests/${requestId}/reject`, {});
    },
    onSuccess: () => {
      toast.success('Member request rejected.');
      qc.invalidateQueries({ queryKey: ['join-requests', communityId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to reject request');
    },
  });

  const saveQuestionsMutation = useMutation({
    mutationFn: async (questions: string[]) => {
      return api.post(`/communities/${communityId}/questions`, { questions });
    },
    onSuccess: () => {
      toast.success('Screening questions saved!');
      qc.invalidateQueries({ queryKey: ['community', communityId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save questions');
    },
  });

  const handleAddQuestion = () => {
    const text = newQuestionText.trim();
    if (!text) return;
    if (questionsList.length >= 5) {
      toast.error('You can set at most 5 screening questions');
      return;
    }
    setQuestionsList([...questionsList, text]);
    setNewQuestionText('');
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestionsList(questionsList.filter((_, i) => i !== idx));
  };

  const handleSaveQuestions = () => {
    saveQuestionsMutation.mutate(questionsList);
  };

  const requests = requestsQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="w-full gap-1">
            <ShieldAlert className="h-4 w-4" />
            Mod Dashboard
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Moderator Dashboard: r/{communityName}
          </DialogTitle>
          <DialogDescription>
            Manage pending join requests and customize membership screening questions.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="requests" className="flex-1 flex flex-col overflow-hidden min-h-0">
          <TabsList className="grid grid-cols-2 shrink-0">
            <TabsTrigger value="requests" className="gap-1.5">
              <Users className="h-4 w-4" />
              Join Requests ({requests.length})
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Screening Questions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="flex-1 overflow-y-auto pt-4 min-h-0 space-y-4">
            {requestsQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No pending join requests at this time.
              </div>
            ) : (
              <div className="space-y-4 pr-1">
                {requests.map((req) => (
                  <Card key={req.id} className="overflow-hidden border border-border/80">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 shrink-0">
                            {req.user.avatarUrl && <AvatarImage src={req.user.avatarUrl} alt={req.user.fullname} />}
                            <AvatarFallback>
                              {req.user.fullname.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold leading-none">{req.user.fullname}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {req.user.email} {req.user.level ? `· Student (${req.user.level})` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200"
                            onClick={() => approveMutation.mutate(req.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => rejectMutation.mutate(req.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>

                      {req.answers.length > 0 && (
                        <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-2.5 border">
                          {req.answers.map((ans, idx) => (
                            <div key={ans.id} className="space-y-0.5">
                              <p className="font-medium text-foreground">
                                Q: {ans.questionText}
                              </p>
                              <p className="text-muted-foreground leading-relaxed pl-3 border-l-2 border-primary/20">
                                {ans.answer}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="questions" className="flex-1 overflow-y-auto pt-4 min-h-0 flex flex-col space-y-4">
            <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
              <Label className="text-sm font-semibold">Custom screening questions (Max 5)</Label>
              <p className="text-xs text-muted-foreground">
                Set questions that users must answer when requesting to join.
              </p>

              <div className="space-y-2">
                {questionsList.map((q, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-3 border rounded-xl bg-muted/20 text-sm">
                    <span className="flex-1 leading-snug">
                      <span className="font-semibold text-primary/70 mr-1.5">{idx + 1}.</span>
                      {q}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => handleRemoveQuestion(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {questionsList.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                    No screening questions set. Users will be able to join without filling out questions.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 shrink-0 pt-4 border-t">
              {questionsList.length < 5 && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a new screening question..."
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddQuestion();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddQuestion}>
                    Add
                  </Button>
                </div>
              )}

              <Button
                type="button"
                className="w-full mt-2"
                onClick={handleSaveQuestions}
                disabled={saveQuestionsMutation.isPending}
              >
                {saveQuestionsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Screening Questions
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
