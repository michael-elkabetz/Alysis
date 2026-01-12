import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Coins, Zap } from 'lucide-react';
import { getVersionCostStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface VersionCostStatsProps {
  analysisId: string;
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

function getVendorColor(vendor: string): string {
  switch (vendor) {
    case 'openai':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'anthropic':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'gemini':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
}

export function VersionCostStats({ analysisId }: VersionCostStatsProps) {
  const { data: costStats, isLoading } = useQuery({
    queryKey: ['version-cost-stats', analysisId],
    queryFn: () => getVersionCostStats(analysisId),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            Version Cost Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!costStats || costStats.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            Version Cost Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Coins className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No execution data yet</p>
            <p className="text-sm">Run some tests to see cost analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCost = costStats.reduce((sum, stat) => sum + stat.totalCost, 0);
  const totalExecutions = costStats.reduce((sum, stat) => sum + stat.executionCount, 0);
  const cheapestVersion = costStats.reduce((min, stat) => 
    stat.avgCostPerExecution < min.avgCostPerExecution ? stat : min
  , costStats[0]);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            Version Cost Analysis
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold text-primary">{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Executions:</span>
              <span className="font-semibold">{formatNumber(totalExecutions)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Version</TableHead>
                <TableHead className="font-semibold">Model</TableHead>
                <TableHead className="text-right font-semibold">Executions</TableHead>
                <TableHead className="text-right font-semibold">Tokens</TableHead>
                <TableHead className="text-right font-semibold">Input Cost</TableHead>
                <TableHead className="text-right font-semibold">Output Cost</TableHead>
                <TableHead className="text-right font-semibold">Total Cost</TableHead>
                <TableHead className="text-right font-semibold">Avg/Exec</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costStats.map((stat) => (
                <TableRow 
                  key={stat.versionId}
                  className={stat.versionId === cheapestVersion.versionId && costStats.length > 1 
                    ? 'bg-emerald-500/5' 
                    : ''
                  }
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">v{stat.version}</span>
                      {stat.versionId === cheapestVersion.versionId && costStats.length > 1 && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          Best Value
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getVendorColor(stat.vendor)}>
                      {stat.model}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(stat.executionCount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatNumber(stat.totalTokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(stat.totalInputCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(stat.totalOutputCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-primary">
                    {formatCurrency(stat.totalCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={stat.versionId === cheapestVersion.versionId && costStats.length > 1 
                      ? 'text-emerald-400 font-medium' 
                      : 'text-muted-foreground'
                    }>
                      {formatCurrency(stat.avgCostPerExecution)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground">
          <p>* Costs are calculated based on current model pricing. Actual costs may vary.</p>
        </div>
      </CardContent>
    </Card>
  );
}
