import { useQuery } from '@tanstack/react-query';
import { DollarSign } from 'lucide-react';
import { getVersionCostStats } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface VersionCostStatsProps {
  appId: string;
  selectedVersionId?: string | null;
}

function formatCost(value: number): string {
  if (value < 0.01) return '$0.00';
  if (value < 1) return `$${value.toFixed(2)}`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function VersionCostStats({ appId, selectedVersionId }: VersionCostStatsProps) {
  const { data: costStats, isLoading } = useQuery({
    queryKey: ['version-cost-stats', appId],
    queryFn: () => getVersionCostStats(appId),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="stat-card rounded-xl border border-border/50 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Version Cost</span>
        </div>
        <Skeleton className="h-7 w-16" />
      </div>
    );
  }

  const versionCost = selectedVersionId
    ? costStats?.find(stat => stat.versionId === selectedVersionId)?.totalCost ?? 0
    : costStats?.reduce((sum, stat) => sum + stat.totalCost, 0) ?? 0;

  return (
    <div className="stat-card rounded-xl border border-border/50 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 mb-1">
        <DollarSign className="w-4 h-4 text-primary" />
        <span className="text-xs text-muted-foreground">Version Cost</span>
      </div>
      <p className="text-xl font-semibold text-foreground">{formatCost(versionCost)}</p>
    </div>
  );
}
