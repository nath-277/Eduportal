'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Star,
  Download,
  Users,
  MessageSquare,
  Sparkles,
  Smartphone,
  Shield,
  Zap,
  Activity,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/layout/admin-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FeedbackUser {
  fullname: string;
  email: string;
}

interface Feedback {
  id: string;
  userRole: 'STUDENT' | 'LECTURER' | 'ADMIN';
  easeOfUse: number;
  interfaceDesign: number;
  reliability: number;
  functionality: number;
  performance: number;
  comments?: string;
  createdAt: string;
  user: FeedbackUser;
}

interface StatsResponse {
  averages: {
    easeOfUse: number;
    interfaceDesign: number;
    reliability: number;
    functionality: number;
    performance: number;
  };
  totalResponses: number;
  feedbacks: Feedback[];
}

export default function AdminFeedbackPage() {
  // Fetch stats and feedbacks
  const feedbackQuery = useQuery({
    queryKey: ['feedback', 'stats'],
    queryFn: async () => api.get<StatsResponse>('/feedback/stats'),
  });

  const { averages, totalResponses, feedbacks } = feedbackQuery.data ?? {
    averages: { easeOfUse: 0, interfaceDesign: 0, reliability: 0, functionality: 0, performance: 0 },
    totalResponses: 0,
    feedbacks: [],
  };

  // Function to download CSV
  const downloadCsv = async () => {
    try {
      let token = null;
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('eduportal-auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          token = parsed.state?.token ?? null;
        }
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/feedback/export`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to export CSV');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'platform-feedback.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Successfully downloaded platform-feedback.csv');
    } catch (err) {
      toast.error('Failed to export CSV. Please try again.');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn(
              'h-3.5 w-3.5',
              s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            title="Platform Usability Feedback"
            subtitle="View reviews, monitor system performance metrics, and export raw data."
          />
          <Button
            onClick={downloadCsv}
            disabled={totalResponses === 0}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-sm text-white"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV Data
          </Button>
        </div>

        {/* Aggregate KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card className="relative overflow-hidden transition-all hover:shadow-md border-primary/20 bg-gradient-to-br from-blue-50/20 to-indigo-50/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Responses</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {feedbackQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{totalResponses}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total reviews submitted</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Ease of Use */}
          <Card className="relative overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Ease of Use</CardTitle>
              <Smartphone className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {feedbackQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-emerald-600">{averages.easeOfUse.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5</span></div>
                  <div className="mt-1">{renderStars(Math.round(averages.easeOfUse))}</div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Interface Design */}
          <Card className="relative overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Interface Design</CardTitle>
              <Sparkles className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              {feedbackQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-indigo-600">{averages.interfaceDesign.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5</span></div>
                  <div className="mt-1">{renderStars(Math.round(averages.interfaceDesign))}</div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Reliability */}
          <Card className="relative overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Reliability</CardTitle>
              <Shield className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {feedbackQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-amber-600">{averages.reliability.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5</span></div>
                  <div className="mt-1">{renderStars(Math.round(averages.reliability))}</div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Functionality */}
          <Card className="relative overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Functionality</CardTitle>
              <Zap className="h-4 w-4 text-pink-500" />
            </CardHeader>
            <CardContent>
              {feedbackQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-pink-600">{averages.functionality.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5</span></div>
                  <div className="mt-1">{renderStars(Math.round(averages.functionality))}</div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="relative overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Performance</CardTitle>
              <Activity className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              {feedbackQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-rose-600">{averages.performance.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5</span></div>
                  <div className="mt-1">{renderStars(Math.round(averages.performance))}</div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Responses Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Feedback Details</CardTitle>
            <CardDescription>All written comments, ratings, and roles of individual submissions.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {feedbackQuery.isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <h3 className="font-semibold text-muted-foreground">No feedback submissions yet</h3>
                <p className="text-xs text-muted-foreground/80 mt-1 max-w-sm">
                  Once users complete the usability surveys from their dashboards, reviews and ratings will populate here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-center">Role</TableHead>
                      <TableHead className="text-center">Ease of Use</TableHead>
                      <TableHead className="text-center">Design</TableHead>
                      <TableHead className="text-center">Reliability</TableHead>
                      <TableHead className="text-center">Function</TableHead>
                      <TableHead className="text-center">Perf</TableHead>
                      <TableHead className="w-[30%]">Comments</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbacks.map((f) => (
                      <TableRow key={f.id} className="transition-colors hover:bg-muted/30">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm flex items-center gap-1.5">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {f.user?.fullname || 'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">{f.user?.email || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-bold text-[10px] tracking-wide rounded-full px-2.5 py-0.5 border-0',
                              f.userRole === 'STUDENT' && 'bg-blue-100 text-blue-800',
                              f.userRole === 'LECTURER' && 'bg-purple-100 text-purple-800',
                              f.userRole === 'ADMIN' && 'bg-amber-100 text-amber-800'
                            )}
                          >
                            {f.userRole}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold font-mono">{f.easeOfUse}</TableCell>
                        <TableCell className="text-center font-semibold font-mono">{f.interfaceDesign}</TableCell>
                        <TableCell className="text-center font-semibold font-mono">{f.reliability}</TableCell>
                        <TableCell className="text-center font-semibold font-mono">{f.functionality}</TableCell>
                        <TableCell className="text-center font-semibold font-mono">{f.performance}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {f.comments || <span className="italic text-muted-foreground/50">No comment left</span>}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground font-mono">
                          {new Date(f.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
