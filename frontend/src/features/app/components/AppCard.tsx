import {
  MoreVertical,
  Key,
  Terminal,
  Trash2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import type { App } from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SNOWFLAKE_LOGO = "/sf.png";

interface AppCardProps {
  app: App;
  animationDelay: number;
  onNavigate: () => void;
  onCopyApiKey: (e: React.MouseEvent) => void;
  onCopyCurl: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onManageTools?: (e: React.MouseEvent) => void;
}

export function AppCard({
  app,
  animationDelay,
  onNavigate,
  onCopyApiKey,
  onCopyCurl,
  onDelete,
}: AppCardProps) {
  const { formatDate } = useRelativeTime();

  const hasSnowflake = app.toolUsage?.snowflake?.enabled;
  const hasTools = hasSnowflake;

  return (
    <div
      onClick={onNavigate}
      onKeyDown={(e) => e.key === "Enter" && onNavigate()}
      role="button"
      tabIndex={0}
      className="group p-5 rounded-2xl border border-border/50 bg-card/50 hover:bg-card/80 hover:border-primary/30 cursor-pointer transition-all duration-200 slide-up"
      style={{ animationDelay: `${animationDelay}ms` }}
      aria-label={`Open ${app.name}`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 pr-2">
          {app.name}
        </h3>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem
                onClick={onCopyApiKey}
                className="cursor-pointer focus:bg-secondary"
              >
                <Key className="w-4 h-4 mr-2" />
                Copy API Key
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onCopyCurl}
                className="cursor-pointer focus:bg-secondary"
              >
                <Terminal className="w-4 h-4 mr-2" />
                Copy cURL
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={onDelete}
                className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
        {app.description || "No description"}
      </p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(app.createdAt)}
          </span>

          {hasTools && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-border/50">
              {hasSnowflake && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-4 h-4 rounded bg-white p-0.5 shadow-sm">
                        <img
                          src={SNOWFLAKE_LOGO}
                          alt="Snowflake"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Snowflake enabled</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>

        <span className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          Open <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}
