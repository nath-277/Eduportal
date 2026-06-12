'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Loader2, ShieldCheck, X } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

interface CreationRequest {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isPrivate: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes: string | null;
  createdAt: string;
  requester: {
    id: string;
    fullname: string;
    email: string;
  };
}

export function AdminRequestsModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const qc = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ['community-requests-admin'],
    queryFn: async () => {
      return api.get<CreationRequest[]>('/communities/requests');
    },
    enabled: open,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return api.post(`/communities/requests/${id}/approve`, { adminNotes: notes });
    },
    onSuccess: () => {
      toast.success('Community request approved!');
      qc.invalidateQueries({ queryKey: ['community-requests-admin'] });
      qc.invalidateQueries({ queryKey: ['discover-communities'] });
      qc.invalidateQueries({ queryKey: ['joined-communities'] });
      setActiveNoteId(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to approve request');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return api.post(`/communities/requests/${id}/reject`, { adminNotes: notes });
    },
    onSuccess: () => {
      toast.success('Community request rejected.');
      qc.invalidateQueries({ queryKey: ['community-requests-admin'] });
      setActiveNoteId(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to reject request');
    },
  });

  const handleNotesChange = (id: string, val: string) => {
    setAdminNotes((prev) => ({
      ...prev,
      [id]: val,
    }));
  };

  const requests = requestsQuery.data ?? [];
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const resolvedRequests = requests.filter((r) => r.status !== 'PENDING');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full gap-2 border-primary/30 hover:bg-primary/5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Admin Approvals ({pendingRequests.length})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Admin: Community Requests
          </DialogTitle>
          <DialogDescription>
            Approve or reject custom community requests submitted by students and lecturers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6 min-h-0 py-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Requests ({pendingRequests.length})
            </h3>

            {requestsQuery.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 italic">No pending requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <Card key={req.id} className="border border-border/80 bg-muted/5">
                    <CardContent className="p-4 space-y-3.5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{req.displayName}</span>
                            <Badge variant="outline" className="text-[10px]">
                              r/{req.name}
                            </Badge>
                            <Badge variant={req.isPrivate ? 'destructive' : 'secondary'} className="text-[9px] px-1.5 py-0">
                              {req.isPrivate ? 'Private' : 'Public'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Requested by: <span className="font-medium text-foreground">{req.requester.fullname}</span> ({req.requester.email})
                          </p>
                        </div>

                        {activeNoteId !== req.id && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              className="h-8 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                              variant="outline"
                              onClick={() => approveMutation.mutate({ id: req.id, notes: adminNotes[req.id] })}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              className="h-8"
                              variant="ghost"
                              onClick={() => setActiveNoteId(req.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>

                      {req.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed bg-background p-2.5 rounded-lg border">
                          {req.description}
                        </p>
                      )}

                      {activeNoteId === req.id && (
                        <div className="space-y-3 pt-2 border-t">
                          <div className="space-y-1.5">
                            <Label htmlFor={`notes-${req.id}`} className="text-xs font-semibold">
                              Rejection Notes / Reason (Optional)
                            </Label>
                            <Textarea
                              id={`notes-${req.id}`}
                              placeholder="Type reason for rejection..."
                              value={adminNotes[req.id] || ''}
                              onChange={(e) => handleNotesChange(req.id, e.target.value)}
                              rows={2}
                              className="text-xs"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => {
                                setActiveNoteId(null);
                                handleNotesChange(req.id, '');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs"
                              onClick={() => rejectMutation.mutate({ id: req.id, notes: adminNotes[req.id] })}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject Request
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Processed History ({resolvedRequests.length})
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {resolvedRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 border rounded-xl text-xs bg-muted/10">
                  <div>
                    <p className="font-semibold text-foreground">{req.displayName} (r/{req.name})</p>
                    <p className="text-muted-foreground mt-0.5">By {req.requester.fullname}</p>
                    {req.adminNotes && (
                      <p className="text-muted-foreground mt-1 italic">Notes: {req.adminNotes}</p>
                    )}
                  </div>
                  <Badge
                    variant={req.status === 'APPROVED' ? 'default' : 'destructive'}
                    className={req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' : ''}
                  >
                    {req.status}
                  </Badge>
                </div>
              ))}
              {resolvedRequests.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No history yet.</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
