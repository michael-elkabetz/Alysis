import { useQuery } from '@tanstack/react-query';
import { DollarSign, Zap, TrendingUp } from 'lucide-react';
import { getVersionCostStats } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface VersionCostKPIProps {
  analysisId: string;
  selectedVersionId: string | null;
}

function formatCurrency(value: number): string {
  if (value < 0.0001) return '$0.00';
  if (value < 0.01) return `$${value.toFixed(6)}`;
  if (value < 1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function VersionCostKPI({ analysisId, selectedVersionId }: VersionCostKPIProps) {
  const { data: costStats, isLoading } = useQuery({
    queryKey: ['version-cost-stats', analysisId],
    queryFn: () => getVersionCostStats(analysisId),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary/30 border border-border/50">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    );
  }

  const selectedVersionStats = costStats?.find(stat => stat.versionId === selectedVersionId);

  if (!selectedVersionStats || selectedVersionStats.executionCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-secondary/30 border border-border/50">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-primary" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Total Cost</span>
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(selectedVersionStats.totalCost)}
          </span>
        </div>
      </div>
      
      <div className="h-4 w-px bg-border/50" />
      
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Avg/Exec</span>
          <span className="text-sm font-semibold">
            {formatCurrency(selectedVersionStats.avgCostPerExecution)}
          </span>
        </div>
      </div>
      
      <div className="h-4 w-px bg-border/50" />
      
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Tokens</span>
          <span className="text-sm font-semibold">
            {formatNumber(selectedVersionStats.totalTokens)}
          </span>
        </div>
      </div>
    </div>
  );
}
