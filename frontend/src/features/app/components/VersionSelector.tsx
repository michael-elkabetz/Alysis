import { History, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import type { PromptVersion } from '@/lib/api';

interface VersionSelectorProps {
  versions: PromptVersion[];
  selectedVersionId: string | null;
  latestVersion: PromptVersion | undefined;
  onSelectVersion: (version: PromptVersion) => void;
  onDeleteVersion: (version: PromptVersion) => void;
}

export function VersionSelector({
  versions,
  selectedVersionId,
  latestVersion,
  onSelectVersion,
  onDeleteVersion,
}: VersionSelectorProps) {
  const { formatRelativeTime } = useRelativeTime();
  const selectedVersion = versions.find((v) => v.id === selectedVersionId);

  if (versions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 w-[140px] justify-between bg-secondary border border-border hover:bg-secondary/80 px-3 font-normal rounded-md"
        >
          <div className="flex items-center gap-2 truncate">
            <span>v{selectedVersion?.version || latestVersion?.version}</span>
            {selectedVersion?.id === latestVersion?.id && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/20 text-primary">
                Latest
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-card border-border w-[140px]">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Version History
        </div>
        <DropdownMenuSeparator />
        {versions.map((version, index) => {
          const isLatest = index === 0;
          const isSelected = version.id === selectedVersionId;
          return (
            <DropdownMenuItem
              key={version.id}
              onClick={() => onSelectVersion(version)}
              className={`cursor-pointer flex items-center justify-between gap-2 ${
                isSelected ? 'bg-primary/10' : 'focus:bg-secondary'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                  v{version.version}
                </span>
                {isLatest && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/20 text-primary">
                    Latest
                  </span>
                )}
              </div>
              {versions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteVersion(version);
                  }}
                  className="p-1 hover:bg-red-500/10 rounded opacity-50 hover:opacity-100 transition-opacity"
                  aria-label={`Delete version ${version.version}`}
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-400" />
                </button>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
