'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, MessageSquare, Loader2, HeartHandshake } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SubmissionStatus {
  hasSubmitted: boolean;
}

export function FeedbackSurveyModal() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [ratings, setRatings] = useState({
    easeOfUse: 0,
    interfaceDesign: 0,
    reliability: 0,
    functionality: 0,
    performance: 0,
  });
  const [hovers, setHovers] = useState({
    easeOfUse: 0,
    interfaceDesign: 0,
    reliability: 0,
    functionality: 0,
    performance: 0,
  });
  const [comments, setComments] = useState('');

  // 1. Check if user has already submitted feedback
  const { data: statusData, isLoading } = useQuery<SubmissionStatus>({
    queryKey: ['feedback', 'my-submission'],
    queryFn: async () => api.get<SubmissionStatus>('/feedback/my-submission'),
  });

  useEffect(() => {
    // Show modal after 1.5 second delay if the user hasn't submitted yet
    if (statusData && !statusData.hasSubmitted) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [statusData]);

  // 2. Submit feedback mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      return api.post('/feedback/submit', {
        ...ratings,
        comments: comments.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success('Thank you! Your feedback has been submitted successfully.');
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to submit feedback');
    },
  });

  const handleRatingChange = (key: keyof typeof ratings, val: number) => {
    setRatings((prev) => ({ ...prev, [key]: val }));
  };

  const handleHoverChange = (key: keyof typeof hovers, val: number) => {
    setHovers((prev) => ({ ...prev, [key]: val }));
  };

  const isFormValid =
    ratings.easeOfUse > 0 &&
    ratings.interfaceDesign > 0 &&
    ratings.reliability > 0 &&
    ratings.functionality > 0 &&
    ratings.performance > 0;

  const criteria: Array<{ key: keyof typeof ratings; label: string; desc: string }> = [
    { key: 'easeOfUse', label: 'Ease of Use', desc: 'Is the platform intuitive and easy to navigate?' },
    { key: 'interfaceDesign', label: 'Interface Design', desc: 'How do you rate the layouts, colors, and styling?' },
    { key: 'reliability', label: 'Reliability', desc: 'Does the portal work correctly without errors?' },
    { key: 'functionality', label: 'Functionality', desc: 'Does the platform have all the features you need?' },
    { key: 'performance', label: 'Performance', desc: 'How fast do pages, actions, and features load?' },
  ];

  if (isLoading || !statusData || statusData.hasSubmitted) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] bg-card border shadow-xl p-6">
        <DialogHeader className="flex flex-col items-center text-center gap-2 pb-2 border-b">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold">Portal Usability Survey</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground max-w-[380px]">
            Please rate your experience using the student/staff portal to help gather data for our project.
          </DialogDescription>
        </DialogHeader>

        {/* Survey ratings list */}
        <div className="py-4 space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {criteria.map(({ key, label, desc }) => {
            const currentVal = hovers[key] || ratings[key];
            return (
              <div key={key} className="flex flex-col gap-1 pb-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold">{label}</span>
                  {/* Stars */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => handleRatingChange(key, star)}
                        onMouseEnter={() => handleHoverChange(key, star)}
                        onMouseLeave={() => handleHoverChange(key, 0)}
                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''} out of 5 for ${label}`}
                        className="p-0.5 focus:outline-none transition-transform active:scale-95"
                      >
                        <Star
                          className={cn(
                            'h-5 w-5 transition-colors duration-150',
                            star <= currentVal
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground/30'
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">{desc}</p>
              </div>
            );
          })}

          {/* Comments Textarea */}
          <div className="flex flex-col gap-2 pt-2 border-t">
            <label htmlFor="survey-comments" className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span>Do you have any suggestions or comments?</span>
            </label>
            <Textarea
              id="survey-comments"
              name="comments"
              placeholder="Tell us what you like or how we can improve..."
              className="resize-none h-20 text-xs"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              maxLength={2000}
            />
          </div>
        </div>

        {/* Dialog footer buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="w-full sm:w-auto h-9 text-xs"
          >
            Remind me later
          </Button>
          <Button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={!isFormValid || submitMutation.isPending}
            className="w-full sm:w-auto h-9 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-sm text-white"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Survey'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
