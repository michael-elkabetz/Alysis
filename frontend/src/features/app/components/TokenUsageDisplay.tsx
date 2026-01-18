interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

interface TokenUsageDisplayProps {
  tokenUsage: TokenUsage;
}

export function TokenUsageDisplay({ tokenUsage }: TokenUsageDisplayProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="text-muted-foreground/60">Tokens:</span>
      <span className="font-medium text-foreground">
        {tokenUsage.total.toLocaleString()}
      </span>
      <span className="text-muted-foreground/40">
        ({tokenUsage.prompt} in / {tokenUsage.completion} out)
      </span>
    </div>
  );
}
