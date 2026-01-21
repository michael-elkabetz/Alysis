import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Search, Settings } from 'lucide-react';
import {
  getApps,
  deleteApp,
  getVendorsAndModels,
  getVendorKeyStatuses,
  magicGenerate,
  type App,
  type Vendor,
} from '@/lib/api';

interface InitialDialogValues {
  name: string;
  description: string;
  systemPrompt: string;
  vendor: string;
  model: string;
  sampleData?: string;
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import logoImg from '@/assets/logo.png';
import { SettingsDialog } from '@/components/SettingsDialog';
import BackgroundEffects from '@/layouts/BackgroundEffects';
import { AppsGrid } from '@/features/app/components/AppsGrid';
import { CreateAppDialog } from '@/features/app/components/CreateAppDialog';
import { DeleteAppDialog } from '@/features/app/components/DeleteDialogs';
import { AIHero } from '@/features/app/components/AIHero';
import { fetchAndRegenerateApiKey, generateCurlCommand } from '@/features/app/hooks/useAppApiKey';
import { toast } from 'sonner';

export default function AppsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<App | null>(null);
  const [initialDialogValues, setInitialDialogValues] = useState<InitialDialogValues | undefined>(undefined);

  const { data: apps = [], isLoading } = useQuery<App[]>({
    queryKey: ['apps'],
    queryFn: () => getApps(),
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-models'],
    queryFn: getVendorsAndModels,
  });

  const { data: vendorKeyStatuses } = useQuery({
    queryKey: ['vendor-key-statuses'],
    queryFn: getVendorKeyStatuses,
  });

  const filteredVendors = vendorsData?.vendors?.filter((vendor) =>
    vendorKeyStatuses?.some((v) => v.vendor === vendor.id && v.configured)
  ) ?? [];
  
  const filteredModelsByVendor = useMemo(() => {
    if (!vendorKeyStatuses || !vendorsData?.modelsByVendor) return {};
    const result: Record<string, Array<{ id: string; displayName: string }>> = {};
    Object.entries(vendorsData.modelsByVendor).forEach(([vendorId, models]) => {
      const isConfigured = vendorKeyStatuses.some((v) => v.vendor === vendorId && v.configured);
      if (isConfigured) {
        result[vendorId] = models;
      }
    });
    return result;
  }, [vendorKeyStatuses, vendorsData]);

  const generateMutation = useMutation({
    mutationFn: (data: { description: string; vendor: string; model: string }) => 
      magicGenerate({
        description: data.description,
        vendor: data.vendor as Vendor,
        model: data.model
      }),
    onSuccess: (data, variables) => {
      setInitialDialogValues({
        ...data,
        vendor: variables.vendor,
        model: variables.model,
      });
      setIsCreateDialogOpen(true);
      toast.success('Configuration generated! Review and save.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApp,
    onSuccess: () => {
      toast.success('App deleted');
      queryClient.invalidateQueries({ queryKey: ['apps'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCopyApiKey = async (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    try {
      const key = await fetchAndRegenerateApiKey(appId);
      if (key) {
        navigator.clipboard.writeText(key);
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
      const key = await fetchAndRegenerateApiKey(appId);
      if (key) {
        const curl = generateCurlCommand(appId, key);
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
    const app = apps.find((a) => a.id === appId);
    if (app) {
      setAppToDelete(app);
    }
  };

  const handleConfirmDelete = () => {
    if (appToDelete) {
      deleteMutation.mutate(appToDelete.id);
      setAppToDelete(null);
    }
  };

  const filteredApps = apps.filter((app: App) =>
    app.name.toLowerCase().includes(search.toLowerCase()) ||
    app.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
      <BackgroundEffects />

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Alysis" className="h-8 w-auto" />
            <span className="font-semibold text-lg tracking-tight hidden sm:block">Alysis</span>
          </div>
          
          <div className="flex items-center gap-2">
            <SettingsDialog
              trigger={
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10 transition-colors">
                  <Settings className="w-4 h-4" />
                </Button>
              }
            />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10 space-y-12">
        <section className="flex flex-col items-center justify-center space-y-8 pt-8 pb-4">

          <AIHero 
            vendors={filteredVendors}
            modelsByVendor={filteredModelsByVendor}
            vendorKeyStatuses={vendorKeyStatuses}
            onGenerate={(data) => generateMutation.mutate(data)}
            onManual={() => {
              setInitialDialogValues(undefined);
              setIsCreateDialogOpen(true);
            }}
            isGenerating={generateMutation.isPending}
          />
        </section>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
             <h2 className="text-xl font-semibold tracking-tight">Your Apps</h2>
             <div className="relative w-full sm:w-72 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                placeholder="Search apps..."
                className="pl-9 h-10 bg-secondary/30 border-transparent focus:bg-background transition-all rounded-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <AppsGrid
            apps={apps}
            filteredApps={filteredApps}
            isLoading={isLoading}
            searchQuery={search}
            onClearSearch={() => setSearch('')}
            onCreateApp={() => {
              setInitialDialogValues(undefined);
              setIsCreateDialogOpen(true);
            }}
            onNavigateToApp={(appId) => navigate(`/apps/${appId}`)}
            onCopyApiKey={handleCopyApiKey}
            onCopyCurl={handleCopyCurl}
            onDeleteApp={handleDelete}
            onManageTools={(e, appId) => {
              e.stopPropagation();
              navigate(`/apps/${appId}?tools=true`);
            }}
          />
        </div>
      </div>

      <CreateAppDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        initialValues={initialDialogValues}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          setInitialDialogValues(undefined);
          queryClient.invalidateQueries({ queryKey: ['apps'] });
        }}
      />

      <DeleteAppDialog
        isOpen={!!appToDelete}
        onOpenChange={(open) => !open && setAppToDelete(null)}
        appName={appToDelete?.name || ''}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
