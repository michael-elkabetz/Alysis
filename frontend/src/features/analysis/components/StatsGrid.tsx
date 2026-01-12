import {
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Gauge,
  Coins,
} from 'lucide-react';
import type { AnalysisStats } from '@/lib/api';

interface StatsGridProps {
  stats: AnalysisStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  const successRate = stats.totalExecutions > 0
    ? `${((stats.successCount / stats.totalExecutions) * 100).toFixed(1)}%`
    : '—';

  const avgLatency = stats.avgLatencyMs > 0
    ? stats.avgLatencyMs < 1000
      ? `${Math.round(stats.avgLatencyMs)}ms`
      : `${(stats.avgLatencyMs / 1000).toFixed(1)}s`
    : '—';

  const totalTokens = stats.totalTokens > 1000000
    ? `${(stats.totalTokens / 1000000).toFixed(1)}M`
    : stats.totalTokens > 1000
      ? `${(stats.totalTokens / 1000).toFixed(1)}K`
      : stats.totalTokens.toLocaleString();

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <div className="stat-card rounded-xl border border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Total Hits</span>
        </div>
        <p className="text-xl font-semibold text-foreground">
          {stats.totalExecutions.toLocaleString()}
        </p>
      </div>

      <div className="stat-card rounded-xl border border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-muted-foreground">Success Rate</span>
        </div>
        <p className="text-xl font-semibold text-emerald-400">{successRate}</p>
      </div>

      <div className="stat-card rounded-xl border border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-muted-foreground">Failures</span>
        </div>
        <p className="text-xl font-semibold text-red-400">
          {stats.errorCount.toLocaleString()}
        </p>
      </div>

      <div className="stat-card rounded-xl border border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-muted-foreground">Avg Latency</span>
        </div>
        <p className="text-xl font-semibold text-foreground">{avgLatency}</p>
      </div>

      <div className="stat-card rounded-xl border border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Coins className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-muted-foreground">Total Tokens</span>
        </div>
        <p className="text-xl font-semibold text-foreground">{totalTokens}</p>
      </div>
    </div>
  );
}
