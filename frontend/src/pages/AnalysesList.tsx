import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Layers,
  MoreVertical,
  Terminal,
  Trash2,
  Key,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { getAnalyses, getAnalysisApiKeys, deleteAnalysis, regenerateApiKey, type Analysis } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import logoImg from '@/assets/logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateAnalysisDialog } from '@/components/CreateAnalysisDialog';
import { SettingsDialog } from '@/components/SettingsDialog';
import BackgroundEffects from '@/components/BackgroundEffects';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <BackgroundEffects />

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
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

          {/* Search and Create Row */}
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
                <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 border-border/50">
                  <Settings className="w-4 h-4" />
                </Button>
              }
            />
          </div>
        </header>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-2xl skeleton" />
            ))}
          </div>
        ) : filteredApps.length === 0 && apps.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="inline-flex p-6 rounded-2xl bg-card/50 border border-border/50 mb-6">
              <Layers className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Create your first app
            </h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              Get started by creating an AI analysis app to process your data.
            </p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="btn-primary h-11 px-6 gap-2"
            >
              <Plus className="w-4 h-4" />
              Create App
            </Button>
          </div>
        ) : filteredApps.length === 0 ? (
          /* No search results */
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No results found</h3>
            <p className="text-muted-foreground mb-4">Try a different search term</p>
            <Button variant="ghost" onClick={() => setSearch('')} className="text-primary">
              Clear search
            </Button>
          </div>
        ) : (
          /* Apps Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredApps.map((app, index) => (
              <div
                key={app.id}
                onClick={() => navigate(`/analyses/${app.id}`)}
                className="group p-5 rounded-2xl border border-border/50 bg-card/50 hover:bg-card/80 hover:border-primary/30 cursor-pointer transition-all duration-200 slide-up"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 pr-2">
                    {app.name}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem
                        onClick={(e) => handleCopyApiKey(e, app.id)}
                        className="cursor-pointer focus:bg-secondary"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Copy API Key
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleCopyCurl(e, app.id)}
                        className="cursor-pointer focus:bg-secondary"
                      >
                        <Terminal className="w-4 h-4 mr-2" />
                        Copy cURL
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem
                        onClick={(e) => handleDelete(e, app.id)}
                        className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
                  {app.description || 'No description'}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(app.createdAt)}
                  </span>
                  <span className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}

            {/* Create Card */}
            <div
              onClick={() => setIsCreateDialogOpen(true)}
              className="group p-5 rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-card/30 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[160px] slide-up"
              style={{ animationDelay: `${filteredApps.length * 40}ms` }}
            >
              <div className="p-3 rounded-xl bg-primary/10 mb-3 group-hover:bg-primary/20 transition-colors">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                New App
              </span>
            </div>
          </div>
        )}
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
