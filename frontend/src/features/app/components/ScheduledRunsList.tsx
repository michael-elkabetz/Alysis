import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getScheduledRuns, deleteScheduledRun, type ScheduledRun, type ScheduledRunStatus } from '@/lib/api';
import { CheckCircle, XCircle, Clock, Loader2, SkipForward, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ScheduledRunsListProps {
  appId: string;
  onViewResult?: (executionLogId: string | null, errorMessage?: string | null) => void;
  onRunComplete?: () => void;
}

function getStatusIcon(status: ScheduledRunStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-gray-500" />;
  }
}

export function ScheduledRunsList({ appId, onViewResult, onRunComplete }: ScheduledRunsListProps) {
  const queryClient = useQueryClient();
  const previousRunsRef = useRef<Map<string, ScheduledRunStatus>>(new Map());

  const { data, isLoading, error } = useQuery({
    queryKey: ['scheduled-runs', appId],
    queryFn: () => getScheduledRuns(appId, 4, 0),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!data?.runs || !onRunComplete) return;

    const currentRuns = data.runs;
    const previousRuns = previousRunsRef.current;
    let hasNewlyCompletedRun = false;

    for (const run of currentRuns) {
      const previousStatus = previousRuns.get(run.id);
      const isNowFinished = run.status === 'completed' || run.status === 'failed';
      const wasRunning = previousStatus === 'running' || previousStatus === 'pending';
      
      if (previousStatus && wasRunning && isNowFinished) {
        hasNewlyCompletedRun = true;
        break;
      }
    }

    const newMap = new Map<string, ScheduledRunStatus>();
    for (const run of currentRuns) {
      newMap.set(run.id, run.status);
    }
    previousRunsRef.current = newMap;

    if (hasNewlyCompletedRun) {
      onRunComplete();
    }
  }, [data?.runs, onRunComplete]);

  const deleteRunMutation = useMutation({
    mutationFn: deleteScheduledRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-runs', appId] });
      queryClient.invalidateQueries({ queryKey: ['schedule', appId] });
      toast.success('Run deleted');
    },
    onError: () => {
      toast.error('Failed to delete run');
    },
  });

  const handleDeleteRun = (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    deleteRunMutation.mutate(runId);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Failed to load runs
      </div>
    );
  }

  if (!data || data.runs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No runs yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="w-[40px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.runs.map((run: ScheduledRun) => {
            const hasResult = !!run.executionLogId;
            const hasError = run.status === 'failed' && !!run.errorMessage;
            const isClickable = (hasResult || hasError) && !!onViewResult;
            return (
              <TableRow
                key={run.id}
                className={cn(isClickable && 'cursor-pointer hover:bg-muted/50')}
                onClick={() => isClickable && onViewResult(run.executionLogId, run.errorMessage)}
              >
                <TableCell className="py-2">
                  <div className="flex items-center justify-center" title={run.status}>
                    {getStatusIcon(run.status)}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-sm">
                    {format(new Date(run.scheduledFor), 'MMM d, HH:mm')}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {formatDistanceToNow(new Date(run.scheduledFor), { addSuffix: true })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteRun(e, run.id)}
                    disabled={deleteRunMutation.isPending}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
