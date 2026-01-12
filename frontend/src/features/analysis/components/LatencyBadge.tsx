import { Zap, Clock } from 'lucide-react';

interface LatencyBadgeProps {
  latencyMs: number;
}

export function LatencyBadge({ latencyMs }: LatencyBadgeProps) {
  if (latencyMs < 1000) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <Zap className="w-3 h-3" />
        {latencyMs}ms
      </span>
    );
  }

  if (latencyMs < 3000) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" />
        {(latencyMs / 1000).toFixed(1)}s
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
      <Clock className="w-3 h-3" />
      {(latencyMs / 1000).toFixed(1)}s
    </span>
  );
}
