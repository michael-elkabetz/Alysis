import { Plus, Layers, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppCard } from './AppCard';
import type { App } from '@/lib/api';

interface AppsGridProps {
  apps: App[];
  filteredApps: App[];
  isLoading: boolean;
  searchQuery: string;
  scheduledAppIds?: Set<string>;
  onClearSearch: () => void;
  onCreateApp: () => void;
  onNavigateToApp: (appId: string) => void;
  onCopyApiKey: (e: React.MouseEvent, appId: string) => void;
  onCopyCurl: (e: React.MouseEvent, appId: string) => void;
  onDeleteApp: (e: React.MouseEvent, appId: string) => void;
  onManageTools?: (e: React.MouseEvent, appId: string) => void;
}

export function AppsGrid({
  apps,
  filteredApps,
  isLoading,
  searchQuery,
  scheduledAppIds,
  onClearSearch,
  onCreateApp,
  onNavigateToApp,
  onCopyApiKey,
  onCopyCurl,
  onDeleteApp,
  onManageTools,
}: AppsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-2xl skeleton" />
        ))}
      </div>
    );
  }

  if (filteredApps.length === 0 && apps.length === 0) {
    return (
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
        <Button onClick={onCreateApp} className="btn-primary h-11 px-6 gap-2">
          <Plus className="w-4 h-4" />
          Create App
        </Button>
      </div>
    );
  }

  if (filteredApps.length === 0 && searchQuery) {
    return (
      <div className="text-center py-16">
        <Search className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No results found</h3>
        <p className="text-muted-foreground mb-4">Try a different search term</p>
        <Button variant="ghost" onClick={onClearSearch} className="text-primary">
          Clear search
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {filteredApps.map((app, index) => (
        <AppCard
          key={app.id}
          app={app}
          animationDelay={index * 40}
          hasSchedule={scheduledAppIds?.has(app.id)}
          onNavigate={() => onNavigateToApp(app.id)}
          onCopyApiKey={(e) => onCopyApiKey(e, app.id)}
          onCopyCurl={(e) => onCopyCurl(e, app.id)}
          onDelete={(e) => onDeleteApp(e, app.id)}
          onManageTools={onManageTools ? (e) => onManageTools(e, app.id) : undefined}
        />
      ))}

      <div
        onClick={onCreateApp}
        onKeyDown={(e) => e.key === 'Enter' && onCreateApp()}
        role="button"
        tabIndex={0}
        className="group p-5 rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-card/30 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[160px] slide-up"
        style={{ animationDelay: `${filteredApps.length * 40}ms` }}
        aria-label="Create new app"
      >
        <div className="p-3 rounded-xl bg-primary/10 mb-3 group-hover:bg-primary/20 transition-colors">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          New App
        </span>
      </div>
    </div>
  );
}
