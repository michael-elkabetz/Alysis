import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Database,
  Globe,
  HardDrive,
  Puzzle,
  Search,
  Plus,
  Loader2,
  Wrench,
  Settings,
} from 'lucide-react';
import {
  getToolDefinitions,
  getToolInstanceStatuses,
  type ToolDefinition,
  type ToolInstanceStatus,
  type ToolCategory,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AddToolInstanceDialog } from '@/components/AddToolInstanceDialog';
import { ToolInstancesSheet } from '@/components/ToolInstancesSheet';
import { getToolIconUrl } from '@/lib/tool-icons';

const CATEGORY_CONFIG: Record<ToolCategory, { label: string; icon: typeof Database; color: string }> = {
  database: { label: 'Databases', icon: Database, color: 'text-blue-500' },
  http: { label: 'HTTP / APIs', icon: Globe, color: 'text-green-500' },
  storage: { label: 'Storage', icon: HardDrive, color: 'text-purple-500' },
  custom: { label: 'Custom', icon: Puzzle, color: 'text-orange-500' },
};

export function ToolCatalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDefinition, setSelectedDefinition] = useState<ToolDefinition | null>(null);
  const [instancesSheetOpen, setInstancesSheetOpen] = useState(false);
  const [selectedDefinitionForInstances, setSelectedDefinitionForInstances] = useState<ToolDefinition | null>(null);

  const { data: definitions = [], isLoading: loadingDefinitions } = useQuery({
    queryKey: ['tool-definitions'],
    queryFn: getToolDefinitions,
  });

  const { data: instances = [] } = useQuery({
    queryKey: ['tool-instance-statuses'],
    queryFn: getToolInstanceStatuses,
  });

  const instancesByDefinition = instances.reduce((acc, instance) => {
    if (!acc[instance.toolDefinitionId]) {
      acc[instance.toolDefinitionId] = [];
    }
    acc[instance.toolDefinitionId].push(instance);
    return acc;
  }, {} as Record<string, ToolInstanceStatus[]>);

  const filteredDefinitions = definitions.filter((def) => {
    const matchesSearch =
      searchQuery === '' ||
      def.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      def.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || def.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const definitionsByCategory = filteredDefinitions.reduce((acc, def) => {
    if (!acc[def.category]) {
      acc[def.category] = [];
    }
    acc[def.category].push(def);
    return acc;
  }, {} as Record<ToolCategory, ToolDefinition[]>);

  const handleAddInstance = (definition: ToolDefinition) => {
    setSelectedDefinition(definition);
    setAddDialogOpen(true);
  };

  const handleViewInstances = (definition: ToolDefinition) => {
    setSelectedDefinitionForInstances(definition);
    setInstancesSheetOpen(true);
  };

  if (loadingDefinitions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
        <p>Loading tool catalog...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/10">
            <Wrench className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tool Catalog</h1>
            <p className="text-muted-foreground">
              Connect external tools and data sources to enhance your apps
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category as ToolCategory)}
                  className="gap-1.5"
                >
                  <Icon className={cn('w-3.5 h-3.5', selectedCategory !== category && config.color)} />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
          const categoryDefs = definitionsByCategory[category as ToolCategory] || [];
          if (categoryDefs.length === 0) return null;

          const Icon = config.icon;

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className={cn('w-5 h-5', config.color)} />
                <h2 className="text-lg font-semibold">{config.label}</h2>
                <Badge variant="secondary" className="ml-2">
                  {categoryDefs.length} tools
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryDefs.map((definition) => {
                  const defInstances = instancesByDefinition[definition.id] || [];

                  return (
                    <ToolCard
                      key={definition.id}
                      definition={definition}
                      instanceCount={defInstances.length}
                      onAdd={() => handleAddInstance(definition)}
                      onViewInstances={() => handleViewInstances(definition)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredDefinitions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Puzzle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No tools found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      <AddToolInstanceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        definition={selectedDefinition}
      />

      <ToolInstancesSheet
        open={instancesSheetOpen}
        onOpenChange={setInstancesSheetOpen}
        definition={selectedDefinitionForInstances}
      />
    </div>
  );
}

interface ToolCardProps {
  definition: ToolDefinition;
  instanceCount: number;
  onAdd: () => void;
  onViewInstances: () => void;
}

function ToolCard({ definition, instanceCount, onAdd, onViewInstances }: ToolCardProps) {
  const hasInstances = instanceCount > 0;

  return (
    <div className="group rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-300">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
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
              <h3 className="font-semibold">{definition.displayName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {definition.builtIn && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    Built-in
                  </Badge>
                )}
                {hasInstances && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {instanceCount} configured
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {definition.description || 'No description available'}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onAdd}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Connection
          </Button>

          {hasInstances && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onViewInstances}
            >
              <Settings className="w-3.5 h-3.5" />
              Manage
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
