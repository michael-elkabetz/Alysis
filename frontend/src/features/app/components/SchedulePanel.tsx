import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScheduleDialog } from './ScheduleDialog';
import { ScheduledRunsList } from './ScheduledRunsList';
import {
  getAppSchedule,
  updateSchedule,
  deleteSchedule,
  triggerSchedule,
  deleteAllScheduledRuns,
} from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Clock,
  Plus,
  Play,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';

const CRON_LABELS: Record<string, string> = {
  '0 * * * *': 'Every Hour',
  '0 */6 * * *': 'Every 6 Hours',
  '0 */12 * * *': 'Every 12 Hours',
  '0 9 * * *': 'Every Day at 9:00',
  '0 9 * * 1': 'Every Monday at 9:00',
  '0 9 1 * *': 'Every 1st of Month at 9:00',
};

function getCronLabel(cronExpression: string): string {
  if (CRON_LABELS[cronExpression]) {
    return CRON_LABELS[cronExpression];
  }
  
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) return cronExpression;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  if (hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    if (minute === '*') return 'Every Minute';
    if (minute.startsWith('*/')) {
      const interval = minute.slice(2);
      return `Every ${interval} Minutes`;
    }
  }
  
  if (minute === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    if (hour === '*') return 'Every Hour';
    if (hour.startsWith('*/')) {
      const interval = hour.slice(2);
      return `Every ${interval} Hours`;
    }
    if (!isNaN(Number(hour))) {
      return `Daily at ${hour.padStart(2, '0')}:00`;
    }
  }
  
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*' && !isNaN(Number(hour)) && !isNaN(Number(minute))) {
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }
  
  if (dayOfMonth === '*' && month === '*' && !isNaN(Number(dayOfWeek))) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[Number(dayOfWeek)] || `Day ${dayOfWeek}`;
    if (!isNaN(Number(hour)) && !isNaN(Number(minute))) {
      return `Every ${day} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    return `Every ${day}`;
  }
  
  return cronExpression;
}

interface SchedulePanelProps {
  appId: string;
  sampleData?: string;
  onViewResult?: (executionLogId: string | null, errorMessage?: string | null) => void;
  onRunComplete?: () => void;
}

export function SchedulePanel({ appId, sampleData, onViewResult, onRunComplete }: SchedulePanelProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['schedule', appId],
    queryFn: () => getAppSchedule(appId),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      updateSchedule(data!.schedule!.id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', appId] });
      toast.success(
        data?.schedule?.enabled ? 'Schedule paused' : 'Schedule enabled'
      );
    },
    onError: (error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSchedule(data!.schedule!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', appId] });
      toast.success('Schedule deleted');
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to delete schedule: ${error.message}`);
    },
  });

  const triggerMutation = useMutation({
    mutationFn: () => triggerSchedule(data!.schedule!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-runs', appId] });
      queryClient.invalidateQueries({ queryKey: ['schedule', appId] });
      toast.success('Run triggered');
    },
    onError: (error) => {
      toast.error(`Failed to trigger run: ${error.message}`);
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => deleteAllScheduledRuns(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-runs', appId] });
      queryClient.invalidateQueries({ queryKey: ['schedule', appId] });
      toast.success('All runs cleared');
    },
    onError: () => {
      toast.error('Failed to clear runs');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
        <p className="text-sm">Loading schedule...</p>
      </div>
    );
  }

  const schedule = data?.schedule;

  if (!schedule) {
    return (
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Schedule</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="h-7 text-xs gap-1.5"
          >
            <Plus className="w-3 h-3" />
            Add Schedule
          </Button>
        </div>

        <div className="text-center py-12 text-muted-foreground border border-dashed border-border/60 rounded-xl bg-secondary/5">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No schedule configured</p>
          <p className="text-sm mb-4">
            Set up automated runs on a recurring schedule
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Schedule
          </Button>
        </div>

        <ScheduleDialog
          appId={appId}
          schedule={null}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          sampleData={sampleData}
        />
      </div>
    );
  }

  const isActive = schedule.enabled;

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Schedule</span>
          <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px] h-5">
            {isActive ? 'Active' : 'Paused'}
          </Badge>
        </div>
      </div>

      <div className={cn(
        "rounded-xl border transition-all duration-300",
        isActive 
          ? "border-primary/20 bg-card/50 backdrop-blur-sm shadow-sm" 
          : "border-border/40 bg-secondary/5 opacity-80 hover:opacity-100"
      )}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isActive ? "bg-primary/10" : "bg-secondary"
            )}>
              <Clock className={cn(
                "w-5 h-5",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {getCronLabel(schedule.cronExpression)}
                </span>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal opacity-60">
                  {schedule.timezone}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {schedule.nextRunAt && (
                  <span>
                    Next: {format(new Date(schedule.nextRunAt), 'MMM d, HH:mm')}
                  </span>
                )}
                {schedule.lastRunAt && (
                  <span>
                    Last: {formatDistanceToNow(new Date(schedule.lastRunAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={schedule.enabled}
              onCheckedChange={(checked) => toggleMutation.mutate(checked)}
              disabled={toggleMutation.isPending}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="h-8 w-8 p-0 hover:bg-secondary"
              title="Edit schedule"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/20 h-8 w-8 p-0 border border-red-500/20 hover:border-red-500/40"
              title="Delete schedule"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="border-t border-border/30">
          <div className="p-3 flex items-center justify-between bg-secondary/5 border-b border-border/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerMutation.mutate()}
              disabled={triggerMutation.isPending || !schedule.enabled}
              className="h-7 text-xs gap-1.5"
            >
              {triggerMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              Run Now
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              {clearAllMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              Clear History
            </Button>
          </div>

          <div className="p-3">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Recent Runs
            </div>
            <ScheduledRunsList appId={appId} onViewResult={onViewResult} onRunComplete={onRunComplete} />
          </div>
        </div>
      </div>

      <ScheduleDialog
        appId={appId}
        schedule={schedule}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        sampleData={sampleData}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the schedule and all run history. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
