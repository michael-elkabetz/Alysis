import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Puzzle,
  Trash2,
  TestTube,
  Save,
  ChevronDown,
  Plus,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getToolInstancesByDefinition,
  updateToolInstance,
  deleteToolInstance,
  testToolInstanceConnection,
  type ToolDefinition,
  type ToolInstance,
} from '@/lib/api';
import { DynamicSchemaForm } from './DynamicSchemaForm';
import { AddToolInstanceDialog } from './AddToolInstanceDialog';
import { getToolIconUrl } from '@/lib/tool-icons';

interface ToolInstancesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition: ToolDefinition | null;
}

export function ToolInstancesSheet({
  open,
  onOpenChange,
  definition,
}: ToolInstancesSheetProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ['tool-instances-by-def', definition?.id],
    queryFn: () => (definition ? getToolInstancesByDefinition(definition.id) : Promise.resolve([])),
    enabled: open && !!definition,
  });

  if (!definition) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-3 mb-2">
              {getToolIconUrl(definition.name) ? (
                <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-border/30 flex items-center justify-center p-1.5">
                  <img
                    src={getToolIconUrl(definition.name)!}
                    alt={definition.displayName}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Puzzle className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <SheetTitle>{definition.displayName} Connections</SheetTitle>
                <SheetDescription>
                  Manage your configured connections
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Connection
            </Button>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                <p className="text-sm">Loading connections...</p>
              </div>
            ) : instances.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Puzzle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No connections configured</p>
                <p className="text-sm">Add a new connection to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {instances.map((instance) => (
                  <InstanceCard
                    key={instance.id}
                    instance={instance}
                    definition={definition}
                  />
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AddToolInstanceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        definition={definition}
      />
    </>
  );
}

interface InstanceCardProps {
  instance: ToolInstance;
  definition: ToolDefinition;
}

function InstanceCard({ instance, definition }: InstanceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState(instance.name);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: () =>
      updateToolInstance(instance.id, {
        name: name !== instance.name ? name : undefined,
        config: Object.keys(config).length > 0 ? config : undefined,
      }),
    onSuccess: () => {
      toast.success('Connection updated');
      queryClient.invalidateQueries({ queryKey: ['tool-instances'] });
      queryClient.invalidateQueries({ queryKey: ['tool-instances-by-def'] });
      queryClient.invalidateQueries({ queryKey: ['tool-instance-statuses'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteToolInstance(instance.id),
    onSuccess: () => {
      toast.success('Connection deleted');
      queryClient.invalidateQueries({ queryKey: ['tool-instances'] });
      queryClient.invalidateQueries({ queryKey: ['tool-instances-by-def'] });
      queryClient.invalidateQueries({ queryKey: ['tool-instance-statuses'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: () => testToolInstanceConnection(instance.id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Connection test successful');
      } else {
        toast.error(result.error || 'Connection test failed');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleExpand = () => {
    if (!isExpanded) {
      setName(instance.name);
      setConfig({});
    }
    setIsExpanded(!isExpanded);
  };

  const handleSave = () => {
    updateMutation.mutate();
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-300 overflow-hidden',
        isExpanded
          ? 'border-primary/30 bg-secondary/10'
          : 'border-border/50 bg-card/50 hover:bg-secondary/5'
      )}
    >
      <button
        onClick={handleExpand}
        className="w-full p-4 flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{instance.name}</h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Updated {new Date(instance.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
          <div className="h-px w-full bg-border/50 mb-4" />

          <div className="space-y-4">
            <div>
              <Label htmlFor={`name-${instance.id}`} className="text-xs">
                Connection Name
              </Label>
              <Input
                id={`name-${instance.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm mt-1"
              />
            </div>

            <DynamicSchemaForm
              schema={definition.configSchema}
              values={config}
              onChange={setConfig}
              existingValues={instance.maskedConfig}
            />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 text-xs"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="w-3 h-3 mr-1" />
                  )}
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                  className="h-8 text-xs"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <TestTube className="w-3 h-3 mr-1" />
                  )}
                  Test
                </Button>
              </div>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="h-8 text-xs"
              >
                {updateMutation.isPending && (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                )}
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
