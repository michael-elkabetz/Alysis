import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Key,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  Database,
  Server,
  Trash2,
} from 'lucide-react';
import {
  getVendorKeyStatuses,
  setVendorKey,
  deleteVendorKey,
  type VendorKeyStatus,
  type Provider,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SettingsDialogProps {
  trigger?: React.ReactNode;
}

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: keyStatuses = [], isLoading } = useQuery({
    queryKey: ['vendor-keys'],
    queryFn: getVendorKeyStatuses,
    enabled: open,
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['vendor-keys'] });
    queryClient.invalidateQueries({ queryKey: ['providers'] });
    queryClient.invalidateQueries({ queryKey: ['vendors-models'] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Key className="w-4 h-4 text-primary" />
            </div>
            <div>
              <DialogTitle>API Key Settings</DialogTitle>
              <DialogDescription>
                Configure your AI provider API keys
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            keyStatuses.map((status) => (
              <VendorKeyCard
                key={status.vendor}
                status={status}
                onUpdate={invalidateQueries}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface VendorKeyCardProps {
  status: VendorKeyStatus;
  onUpdate: () => void;
}

function VendorKeyCard({ status, onUpdate }: VendorKeyCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (apiKey: string) => setVendorKey(status.vendor, apiKey),
    onSuccess: () => {
      toast.success(`${getProviderDisplayName(status.vendor)} API key saved`);
      setIsEditing(false);
      setNewKey('');
      onUpdate();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVendorKey(status.vendor),
    onSuccess: () => {
      toast.success(`${getProviderDisplayName(status.vendor)} API key removed`);
      onUpdate();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    if (!newKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }
    saveMutation.mutate(newKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newKey.trim()) {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setNewKey('');
    }
  };

  return (
    <div className="p-4 rounded-xl border border-border bg-secondary/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{getProviderDisplayName(status.vendor)}</span>
          {status.configured ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Check className="w-3 h-3" />
              Configured
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
              <X className="w-3 h-3" />
              Not Set
            </span>
          )}
        </div>
        {status.source && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {status.source === 'database' ? (
              <>
                <Database className="w-3 h-3" />
                <span>Database</span>
              </>
            ) : (
              <>
                <Server className="w-3 h-3" />
                <span>Environment</span>
              </>
            )}
          </div>
        )}
      </div>

      {status.configured && !isEditing && (
        <div className="flex items-center justify-between">
          <code className="text-sm text-muted-foreground font-mono">
            {status.maskedKey}
          </code>
          <div className="flex items-center gap-2">
            {status.source === 'database' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8"
            >
              Change
            </Button>
          </div>
        </div>
      )}

      {(isEditing || !status.configured) && (
        <div className="space-y-3">
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder={`Enter ${getProviderDisplayName(status.vendor)} API key`}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-10 font-mono text-sm input-modern !bg-[#f5f0e8]"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex items-center gap-2 justify-end">
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setNewKey('');
                }}
              >
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending || !newKey.trim()}
              className="btn-primary"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function getProviderDisplayName(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return 'OpenAI';
    case 'anthropic':
      return 'Anthropic';
    case 'gemini':
      return 'Google Gemini';
    default:
      return provider;
  }
}
