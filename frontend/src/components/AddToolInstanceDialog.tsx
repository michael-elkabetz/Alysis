import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Puzzle, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createToolInstance, type ToolDefinition } from '@/lib/api';
import { DynamicSchemaForm } from './DynamicSchemaForm';
import { getToolIconUrl } from '@/lib/tool-icons';

interface AddToolInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition: ToolDefinition | null;
}

export function AddToolInstanceDialog({
  open,
  onOpenChange,
  definition,
}: AddToolInstanceDialogProps) {
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    if (definition) {
      setName(`${definition.displayName} Connection`);
      setConfig({});
    }
  }, [definition]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!definition) throw new Error('No definition selected');
      return createToolInstance({
        toolDefinitionId: definition.id,
        name,
        config,
      });
    },
    onSuccess: () => {
      toast.success('Tool connection created successfully');
      queryClient.invalidateQueries({ queryKey: ['tool-instances'] });
      queryClient.invalidateQueries({ queryKey: ['tool-instance-statuses'] });
      onOpenChange(false);
      setName('');
      setConfig({});
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a connection name');
      return;
    }

    if (definition) {
      const requiredFields = definition.configSchema.required || [];
      for (const field of requiredFields) {
        const value = config[field];
        if (value === undefined || value === null || value === '') {
          toast.error(`Please fill in required field: ${field}`);
          return;
        }
      }
    }

    createMutation.mutate();
  };

  if (!definition) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl border-border/50 max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              {getToolIconUrl(definition.name) ? (
                <div className="w-12 h-12 rounded-lg bg-white shadow-sm border border-border/30 flex items-center justify-center p-2">
                  <img
                    src={getToolIconUrl(definition.name)!}
                    alt={definition.displayName}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <Puzzle className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <DialogTitle className="text-xl">
                  Add {definition.displayName} Connection
                </DialogTitle>
                <DialogDescription className="text-base">
                  {definition.description || 'Configure a new connection'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            <div>
              <Label htmlFor="instance-name" className="text-xs font-medium">
                Connection Name *
              </Label>
              <Input
                id="instance-name"
                placeholder="My Connection"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A friendly name to identify this connection
              </p>
            </div>

            <div>
              <Label className="text-xs font-medium mb-3 block">
                Connection Configuration
              </Label>
              <DynamicSchemaForm
                schema={definition.configSchema}
                values={config}
                onChange={setConfig}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Connection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
