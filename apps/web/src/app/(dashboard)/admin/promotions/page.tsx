'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpCircle,
  GraduationCap,
  Users,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/layout/admin-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface Session {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface PromotionPreview {
  studentId: string;
  fullname: string;
  matricNumber: string;
  department: string;
  currentLevel: string;
  cgpa: number;
  projectedLevel: string;
  status: 'PROMOTED' | 'REPEATED' | 'GRADUATED';
}

export default function AdminPromotionsPage() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // 1. Fetch sessions
  const sessionsQuery = useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: async () => {
      const data = await api.get<Session[]>('/sessions');
      // Set current session as default if not set
      const current = data.find((s) => s.isCurrent);
      if (current && !selectedSessionId) {
        setSelectedSessionId(current.id);
      } else if (data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].id);
      }
      return data;
    },
  });

  const sessions = sessionsQuery.data ?? [];

  // 2. Fetch promotion previews
  const previewQuery = useQuery({
    queryKey: ['promotions', 'preview', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return [];
      const res = await api.get<{ previews: PromotionPreview[] }>(
        `/promotions/preview?sessionId=${selectedSessionId}`
      );
      const list = res.previews;
      // Pre-select students who are promoted or graduating
      const autoSelected = list
        .filter((p) => p.status === 'PROMOTED' || p.status === 'GRADUATED')
        .map((p) => p.studentId);
      setSelectedStudentIds(autoSelected);
      return list;
    },
    enabled: !!selectedSessionId,
  });

  const previews = previewQuery.data ?? [];

  // Stats calculation
  const stats = useMemo(() => {
    let promoted = 0;
    let repeated = 0;
    let graduated = 0;
    previews.forEach((p) => {
      if (p.status === 'PROMOTED') promoted++;
      else if (p.status === 'REPEATED') repeated++;
      else if (p.status === 'GRADUATED') graduated++;
    });
    return { promoted, repeated, graduated, total: previews.length };
  }, [previews]);

  // Execute promotions mutation
  const executeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSessionId) throw new Error('No academic session selected');
      if (selectedStudentIds.length === 0) throw new Error('No students selected');
      return api.post('/promotions/execute', {
        sessionId: selectedSessionId,
        studentIds: selectedStudentIds,
      });
    },
    onSuccess: () => {
      toast.success('Successfully executed promotions for selected students');
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setSelectedStudentIds([]);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Execution failed');
    },
  });

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === previews.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(previews.map((p) => p.studentId));
    }
  };

  const isAllSelected = previews.length > 0 && selectedStudentIds.length === previews.length;

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            title="Student Promotion System"
            subtitle="Batch promote eligible students, project advancements, and handle academic probations."
          />
          <div className="flex items-center gap-3 bg-card p-2 rounded-lg border shadow-sm self-start sm:self-auto">
            <span className="text-xs font-semibold text-muted-foreground px-2">Academic Session:</span>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.isCurrent && '(Current)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Total Students</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {previewQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">Pending evaluation</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Eligible for Promotion</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {previewQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-emerald-600">{stats.promoted}</div>
                  <p className="text-xs text-muted-foreground mt-1">CGPA &ge; 1.50</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Academic Probation</CardTitle>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              {previewQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-rose-600">{stats.repeated}</div>
                  <p className="text-xs text-muted-foreground mt-1">CGPA &lt; 1.50 (Repeating)</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Graduating</CardTitle>
              <GraduationCap className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              {previewQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-violet-600">{stats.graduated}</div>
                  <p className="text-xs text-muted-foreground mt-1">Completed final level</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Controls & Table */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4">
            <div>
              <CardTitle className="text-base font-bold">Promotion Projections</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Eligible students are pre-checked. Verify and submit to apply changes.
              </p>
            </div>
            <Button
              onClick={() => executeMutation.mutate()}
              disabled={selectedStudentIds.length === 0 || executeMutation.isPending}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-sm text-white"
            >
              {executeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Execute Promotions ({selectedStudentIds.length})
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {previewQuery.isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : previews.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <h3 className="font-semibold text-muted-foreground">No active students to evaluate</h3>
                <p className="text-xs text-muted-foreground/85 mt-1 max-w-sm">
                  All active students may already be graduated or there are no student accounts registered in the portal.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">
                        <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Matric No.</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-center">Current Level</TableHead>
                      <TableHead className="text-center">CGPA</TableHead>
                      <TableHead className="text-center">Projected Level</TableHead>
                      <TableHead className="text-center">Status Outcome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previews.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.studentId);
                      return (
                        <TableRow
                          key={student.studentId}
                          className={cn(
                            'transition-colors hover:bg-muted/30',
                            isSelected && 'bg-blue-50/20'
                          )}
                        >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectStudent(student.studentId)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{student.fullname}</TableCell>
                          <TableCell>{student.matricNumber || '—'}</TableCell>
                          <TableCell>{student.department}</TableCell>
                          <TableCell className="text-center font-mono">{student.currentLevel}</TableCell>
                          <TableCell className="text-center font-mono font-semibold">
                            {student.cgpa.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-blue-600">
                            {student.projectedLevel}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                'font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded-full border-0',
                                student.status === 'PROMOTED' && 'bg-emerald-100 text-emerald-800',
                                student.status === 'GRADUATED' && 'bg-violet-100 text-violet-800',
                                student.status === 'REPEATED' && 'bg-rose-100 text-rose-800'
                              )}
                            >
                              {student.status === 'REPEATED' ? 'PROBATION (REPEATS)' : student.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
