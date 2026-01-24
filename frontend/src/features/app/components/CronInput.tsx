import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CronPreset {
  label: string;
  value: string;
}

const CRON_PRESETS: CronPreset[] = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Every day at 9:00', value: '0 9 * * *' },
  { label: 'Every Monday at 9:00', value: '0 9 * * 1' },
  { label: 'Every 1st of month at 9:00', value: '0 9 1 * *' },
  { label: 'Custom', value: 'custom' },
];

interface CronInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  timezone?: string;
}

function formatTimeForTimezone(hour: number, timezone: string): string {
  try {
    const date = new Date();
    date.setUTCHours(hour, 0, 0, 0);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    });
  } catch {
    return `${hour.toString().padStart(2, '0')}:00`;
  }
}

function getPresetLabel(preset: CronPreset, timezone: string): string {
  if (preset.value === 'custom') return preset.label;
  
  const match = preset.value.match(/^0 (\d+) /);
  if (match && timezone !== 'UTC') {
    const hour = parseInt(match[1], 10);
    const localTime = formatTimeForTimezone(hour, timezone);
    return preset.label.replace(/at \d+:\d+/, `at ${localTime}`);
  }
  
  return preset.label;
}

export function CronInput({ value, onChange, disabled, timezone = 'UTC' }: CronInputProps) {
  const isPreset = CRON_PRESETS.some(p => p.value === value && p.value !== 'custom');
  const [isCustom, setIsCustom] = useState(!isPreset);
  const [selectedPreset, setSelectedPreset] = useState(
    isPreset ? value : 'custom'
  );

  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue);
    if (presetValue === 'custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      onChange(presetValue);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="cron-preset" className="text-xs mb-1.5 block">Frequency</Label>
        <Select
          value={selectedPreset}
          onValueChange={handlePresetChange}
          disabled={disabled}
        >
          <SelectTrigger id="cron-preset" className="h-9">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            {CRON_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {getPresetLabel(preset, timezone)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isCustom && (
        <div>
          <Label htmlFor="cron-expression" className="text-xs mb-1.5 block">Cron Expression</Label>
          <Input
            id="cron-expression"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0 9 * * *"
            disabled={disabled}
            className="h-9 font-mono text-xs"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Format: minute hour day-of-month month day-of-week
          </p>
        </div>
      )}
    </div>
  );
}
