import { MoreVertical, Copy, Key, Terminal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppActionsMenuProps {
  onCopyAppId: () => void;
  onCopyApiKey: () => void;
  onCopyCurl: () => void;
  onDelete: () => void;
}

export function AppActionsMenu({
  onCopyAppId,
  onCopyApiKey,
  onCopyCurl,
  onDelete,
}: AppActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-secondary"
          aria-label="More options"
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border">
        <DropdownMenuItem
          onClick={onCopyAppId}
          className="cursor-pointer focus:bg-secondary"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy App ID
        </DropdownMenuItem>
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete app
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
