import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

type FrequencyType = 'hourly' | 'daily' | 'weekly' | 'monthly';

interface ScheduleConfig {
  frequencyType: FrequencyType;
  hourInterval: number;
  times: string[];
  weekDays: number[];
  monthDay: number;
}

const WEEK_DAYS = [
  { value: 0, label: 'S', fullLabel: 'Sun' },
  { value: 1, label: 'M', fullLabel: 'Mon' },
  { value: 2, label: 'T', fullLabel: 'Tue' },
  { value: 3, label: 'W', fullLabel: 'Wed' },
  { value: 4, label: 'T', fullLabel: 'Thu' },
  { value: 5, label: 'F', fullLabel: 'Fri' },
  { value: 6, label: 'S', fullLabel: 'Sat' },
];

const HOUR_INTERVALS = [
  { value: 1, label: 'Every hour' },
  { value: 2, label: 'Every 2 hours' },
  { value: 3, label: 'Every 3 hours' },
  { value: 4, label: 'Every 4 hours' },
  { value: 6, label: 'Every 6 hours' },
  { value: 8, label: 'Every 8 hours' },
  { value: 12, label: 'Every 12 hours' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function cronToConfig(cron: string): ScheduleConfig {
  const defaultConfig: ScheduleConfig = {
    frequencyType: 'daily',
    hourInterval: 1,
    times: ['09:00'],
    weekDays: [1],
    monthDay: 1,
  };

  const parts = cron.split(' ');
  if (parts.length !== 5) return defaultConfig;

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;

  // Check for hourly patterns
  if (hour === '*' || hour.startsWith('*/')) {
    const interval = hour === '*' ? 1 : parseInt(hour.slice(2), 10);
    return { ...defaultConfig, frequencyType: 'hourly', hourInterval: interval || 1 };
  }

  // Parse times (can be comma-separated like "9,18")
  const hours = hour.split(',').map(h => parseInt(h, 10)).filter(h => !isNaN(h));
  const min = parseInt(minute, 10) || 0;
  const times = hours.map(h => `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);

  if (times.length === 0) {
    times.push('09:00');
  }

  // Monthly
  if (dayOfMonth !== '*' && !isNaN(Number(dayOfMonth))) {
    return { ...defaultConfig, frequencyType: 'monthly', times, monthDay: Number(dayOfMonth) };
  }

  // Weekly
  if (dayOfWeek !== '*') {
    const days = dayOfWeek.split(',').map(Number).filter(n => !isNaN(n));
    return { ...defaultConfig, frequencyType: 'weekly', times, weekDays: days.length > 0 ? days : [1] };
  }

  // Daily
  return { ...defaultConfig, frequencyType: 'daily', times };
}

function configToCron(config: ScheduleConfig): string {
  switch (config.frequencyType) {
    case 'hourly':
      return config.hourInterval === 1 
        ? '0 * * * *' 
        : `0 */${config.hourInterval} * * *`;
    
    case 'daily':
    case 'weekly':
    case 'monthly': {
      // All times must have the same minute for cron
      const [, minute] = config.times[0].split(':');
      const hours = config.times.map(t => parseInt(t.split(':')[0], 10)).sort((a, b) => a - b);
      const hourStr = hours.join(',');

      if (config.frequencyType === 'daily') {
        return `${minute} ${hourStr} * * *`;
      }
      if (config.frequencyType === 'weekly') {
        const days = config.weekDays.sort().join(',');
        return `${minute} ${hourStr} * * ${days}`;
      }
      // monthly
      return `${minute} ${hourStr} ${config.monthDay} * *`;
    }
    
    default:
      return '0 9 * * *';
  }
}

interface ScheduleTimeInputProps {
  value: string;
  onChange: (cron: string) => void;
  disabled?: boolean;
}

export function ScheduleTimeInput({ value, onChange, disabled }: ScheduleTimeInputProps) {
  const [config, setConfig] = useState<ScheduleConfig>(() => cronToConfig(value));

  useEffect(() => {
    const newConfig = cronToConfig(value);
    setConfig(newConfig);
  }, [value]);

  const updateConfig = (updates: Partial<ScheduleConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(configToCron(newConfig));
  };

  const addTime = () => {
    if (config.times.length < 4) {
      const newTimes = [...config.times, '12:00'];
      updateConfig({ times: newTimes });
    }
  };

  const removeTime = (index: number) => {
    if (config.times.length > 1) {
      const newTimes = config.times.filter((_, i) => i !== index);
      updateConfig({ times: newTimes });
    }
  };

  const updateTime = (index: number, time: string) => {
    const newTimes = [...config.times];
    newTimes[index] = time;
    updateConfig({ times: newTimes });
  };

  const showTimes = config.frequencyType !== 'hourly';

  return (
    <div className="space-y-4">
      {/* Frequency Type Selection */}
      <div>
        <Label className="text-xs mb-1.5 block">Frequency</Label>
        <Select
          value={config.frequencyType}
          onValueChange={(f) => updateConfig({ frequencyType: f as FrequencyType })}
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Hourly Interval */}
      {config.frequencyType === 'hourly' && (
        <div>
          <Label className="text-xs mb-1.5 block">Interval</Label>
          <Select
            value={String(config.hourInterval)}
            onValueChange={(v) => updateConfig({ hourInterval: Number(v) })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOUR_INTERVALS.map((interval) => (
                <SelectItem key={interval.value} value={String(interval.value)}>
                  {interval.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Time Selection */}
      {showTimes && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs">
              {config.times.length > 1 ? 'Times' : 'Time'}
            </Label>
            {config.times.length < 4 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addTime}
                disabled={disabled}
                className="h-6 text-xs px-2 gap-1"
              >
                <Plus className="w-3 h-3" />
                Add time
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {config.times.map((time, index) => {
              const [hour, minute] = time.split(':');
              return (
                <div key={`time-${index}-${time}`} className="flex items-center gap-2">
                  <Select
                    value={hour}
                    onValueChange={(h) => updateTime(index, `${h}:${minute}`)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground">:</span>
                  <Select
                    value={minute}
                    onValueChange={(m) => updateTime(index, `${hour}:${m}`)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTES.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {config.times.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTime(index)}
                      disabled={disabled}
                      className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Day Selection */}
      {config.frequencyType === 'weekly' && (
        <div>
          <Label className="text-xs mb-1.5 block">On days</Label>
          <ToggleGroup
            type="multiple"
            value={config.weekDays.map(String)}
            onValueChange={(values) => {
              const days = values.map(Number);
              if (days.length > 0) {
                updateConfig({ weekDays: days });
              }
            }}
            className="w-full justify-between"
            disabled={disabled}
          >
            {WEEK_DAYS.map((day) => (
              <ToggleGroupItem
                key={day.value}
                value={String(day.value)}
                aria-label={day.fullLabel}
                className={cn(
                  "flex-1 h-9 text-xs font-medium rounded-lg",
                  "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                )}
              >
                {day.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      {/* Monthly Day Selection */}
      {config.frequencyType === 'monthly' && (
        <div>
          <Label className="text-xs mb-1.5 block">On day</Label>
          <Select
            value={String(config.monthDay)}
            onValueChange={(d) => updateConfig({ monthDay: Number(d) })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Summary */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
        {config.frequencyType === 'hourly' && (
          <span>
            Runs {config.hourInterval === 1 ? 'every hour' : `every ${config.hourInterval} hours`}
          </span>
        )}
        {config.frequencyType === 'daily' && (
          <span>
            Runs every day at {config.times.sort().join(', ')}
          </span>
        )}
        {config.frequencyType === 'weekly' && (
          <span>
            Runs every{' '}
            {config.weekDays.sort().map((d) => WEEK_DAYS[d].fullLabel).join(', ')}{' '}
            at {config.times.sort().join(', ')}
          </span>
        )}
        {config.frequencyType === 'monthly' && (
          <span>
            Runs on day {config.monthDay} of every month at {config.times.sort().join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}
