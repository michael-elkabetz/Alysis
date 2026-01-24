import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CronInput } from './CronInput';
import {
  createSchedule,
  updateSchedule,
  type AppSchedule,
  type CreateScheduleDto,
  type UpdateScheduleDto,
} from '@/lib/api';
import { toast } from 'sonner';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: 'New York (GMT-5/-4)' },
  { value: 'America/Chicago', label: 'Chicago (GMT-6/-5)' },
  { value: 'America/Denver', label: 'Denver (GMT-7/-6)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8/-7)' },
  { value: 'Europe/London', label: 'London (GMT+0/+1)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1/+2)' },
  { value: 'Europe/Berlin', label: 'Berlin (GMT+1/+2)' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem (GMT+2/+3)' },
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+10/+11)' },
];

interface ScheduleDialogProps {
  appId: string;
  schedule: AppSchedule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sampleData?: string;
}

export function ScheduleDialog({
  appId,
  schedule,
  open,
  onOpenChange,
  sampleData,
}: ScheduleDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!schedule;

  const [cronExpression, setCronExpression] = useState(
    schedule?.cronExpression || '0 9 * * *'
  );
  const [timezone, setTimezone] = useState(schedule?.timezone || 'Asia/Jerusalem');
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);

  const getDefaultInputData = (): Record<string, unknown> | null => {
    if (schedule?.inputData) return schedule.inputData;
    if (sampleData) {
      try {
        return JSON.parse(sampleData);
      } catch {
        return null;
      }
    }
    return null;
  };

  const [inputData] = useState<Record<string, unknown> | null>(getDefaultInputData);

  useEffect(() => {
    if (open) {
      setCronExpression(schedule?.cronExpression || '0 9 * * *');
      setTimezone(schedule?.timezone || 'Asia/Jerusalem');
      setEnabled(schedule?.enabled ?? true);
    }
  }, [open, schedule]);

  const createMutation = useMutation({
    mutationFn: (dto: CreateScheduleDto) => createSchedule(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', appId] });
      queryClient.invalidateQueries({ queryKey: ['app', appId] });
      toast.success('Schedule created');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to create schedule: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateScheduleDto) => updateSchedule(schedule!.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', appId] });
      toast.success('Schedule updated');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (isEditing) {
      updateMutation.mutate({
        cronExpression,
        timezone,
        enabled,
        inputData: inputData || undefined,
      });
    } else {
      createMutation.mutate({
        appId,
        cronExpression,
        timezone,
        enabled,
        inputData: inputData || undefined,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Schedule' : 'Create Schedule'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modify the schedule configuration.'
              : 'Set up automated runs on a recurring schedule.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="timezone" className="text-xs mb-1.5 block">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={isLoading}>
              <SelectTrigger id="timezone" className="h-9">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CronInput
            value={cronExpression}
            onChange={setCronExpression}
            disabled={isLoading}
            timezone={timezone}
          />

          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="enabled" className="text-sm">Enabled</Label>
              <p className="text-xs text-muted-foreground">
                Start running immediately
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={isLoading}
            />
          </div>

          {inputData && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <span className="font-medium">Input:</span>{' '}
              Uses configured sample data
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            size="sm"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} size="sm">
            {isLoading ? 'Saving...' : isEditing ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
