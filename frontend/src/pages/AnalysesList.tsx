import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Search, Settings } from 'lucide-react';
import {
  getAnalyses,
  getAnalysisApiKeys,
  deleteAnalysis,
  regenerateApiKey,
  type Analysis,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import logoImg from '@/assets/logo.png';
import { SettingsDialog } from '@/components/SettingsDialog';
import BackgroundEffects from '@/layouts/BackgroundEffects';
import { AppsGrid, CreateAnalysisDialog } from '@/features/analysis/components';
import { toast } from 'sonner';

export default function AnalysesList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: apps = [], isLoading } = useQuery<Analysis[]>({
    queryKey: ['analyses'],
    queryFn: async () => await getAnalyses(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnalysis,
    onSuccess: () => {
      toast.success('App deleted');
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCopyApiKey = async (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    try {
      const keys = await getAnalysisApiKeys(appId);
      if (keys.length > 0) {
        const result = await regenerateApiKey(keys[0].id);
        navigator.clipboard.writeText(result.key);
        toast.success('New API key generated and copied');
      } else {
        toast.error('No API key found');
      }
    } catch {
      toast.error('Failed to get API key');
    }
  };

  const handleCopyCurl = async (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    try {
      const keys = await getAnalysisApiKeys(appId);
      if (keys.length > 0) {
        const result = await regenerateApiKey(keys[0].id);
        const curl = `curl -X POST "${window.location.origin}/api/v1/analyze/${appId}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${result.key}" \\
  -d '{"input": {"data": "your data here"}}'`;
        navigator.clipboard.writeText(curl);
        toast.success('cURL with new API key copied');
      } else {
        toast.error('No API key found');
      }
    } catch {
      toast.error('Failed to generate cURL');
    }
  };

  const handleDelete = (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this app?')) {
      deleteMutation.mutate(appId);
    }
  };

  const filteredApps = apps.filter((app: Analysis) =>
    app.name.toLowerCase().includes(search.toLowerCase()) ||
    app.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <BackgroundEffects />

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <header className="mb-12">
          <div className="text-center mb-10">
            <img
              src={logoImg}
              alt="Alysis"
              className="h-16 mx-auto mb-4"
            />
            <p className="text-muted-foreground text-lg">
              Your one-stop shop for AI analysis apps
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1 w-full group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                placeholder="Search apps..."
                className="pl-11 h-12 bg-card/50 border-border/50 rounded-xl focus:border-primary/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search apps"
              />
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="btn-primary h-12 px-6 gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              New App
            </Button>
            <SettingsDialog
              trigger={
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0 border-border/50"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              }
            />
          </div>
        </header>

        <AppsGrid
          apps={apps}
          filteredApps={filteredApps}
          isLoading={isLoading}
          searchQuery={search}
          onClearSearch={() => setSearch('')}
          onCreateApp={() => setIsCreateDialogOpen(true)}
          onNavigateToApp={(appId) => navigate(`/analyses/${appId}`)}
          onCopyApiKey={handleCopyApiKey}
          onCopyCurl={handleCopyCurl}
          onDeleteApp={handleDelete}
        />
      </div>

      <CreateAnalysisDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['analyses'] });
        }}
      />
    </div>
  );
}
