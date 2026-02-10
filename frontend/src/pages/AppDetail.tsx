import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Play, Activity, Loader2, Terminal, Trash2 } from 'lucide-react';
import {
  getApp,
  getPromptVersions,
  deletePromptVersion,
  getVendorsAndModels,
  getVendorKeyStatuses,
  deleteApp,
  getExecutionLog,
  type AppStats,
  type PromptVersion,
  type Vendor,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import BackgroundEffects from '@/layouts/BackgroundEffects';
import { StatsGrid } from '@/features/app/components/StatsGrid';
import { PromptEditor } from '@/features/app/components/PromptEditor';
import { DeleteAppDialog, DeleteVersionDialog } from '@/features/app/components/DeleteDialogs';
import { VersionSelector } from '@/features/app/components/VersionSelector';
import { ModelSelector } from '@/features/app/components/ModelSelector';
import { InlineEditField } from '@/features/app/components/InlineEditField';
import { VersionCostStats } from '@/features/app/components/VersionCostStats';
import { ExecutionResultSheet } from '@/features/app/components/ExecutionResultSheet';
import { DevSpaceSheet } from '@/features/app/components/DevSpaceSheet';
import { ToolUsagePanel } from '@/features/app/components/ToolUsagePanel';
import { SchedulePanel } from '@/features/app/components/SchedulePanel';
import { useTestRunner } from '@/features/app/hooks/useTestRunner';
import { usePromptEditor } from '@/features/app/hooks/usePromptEditor';
import { useInlineEdit } from '@/features/app/hooks/useInlineEdit';
import { useAppApiKey } from '@/features/app/hooks/useAppApiKey';

export default function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<PromptVersion | null>(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const [isResultCollapsed, setIsResultCollapsed] = useState(false);
  const [isDevSpaceOpen, setIsDevSpaceOpen] = useState(false);
  const [isDevSpaceCollapsed, setIsDevSpaceCollapsed] = useState(true);
  const [viewedResult, setViewedResult] = useState<{
    output: Record<string, unknown>;
    rawResponse: string;
    latencyMs: number;
    tokenUsage: { prompt: number; completion: number; total: number };
    error?: string | null;
  } | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [scheduledRunError, setScheduledRunError] = useState<string | null>(null);
  const [currentSampleData, setCurrentSampleData] = useState<string>('');

  const { data: app, isLoading: isLoadingApp } = useQuery({
    queryKey: ['app', id],
    queryFn: () => getApp(id!),
    enabled: !!id,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['prompts', id],
    queryFn: () => getPromptVersions(id!),
    enabled: !!id,
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-models'],
    queryFn: getVendorsAndModels,
  });

  const { data: vendorKeyStatuses } = useQuery({
    queryKey: ['vendor-key-statuses'],
    queryFn: getVendorKeyStatuses,
  });

  const vendors = vendorsData?.vendors?.filter((vendor) =>
    vendorKeyStatuses?.some((v) => v.vendor === vendor.id && v.configured)
  ) ?? [];
  
  const modelsByVendor = useMemo(() => {
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

  const {
    promptState,
    selectedVersionId,
    latestVersion,
    isSelectedDifferentFromActive,
    isSaving,
    handleSelectVersion,
    handleSave,
    updateVendor,
    updateModel,
    updateSystemPrompt,
  } = usePromptEditor({
    appId: id!,
    app,
    versions,
    modelsByVendor,
    sampleData: currentSampleData,
  });

  const { data: stats } = useQuery<AppStats>({
    queryKey: ['app-stats', id, selectedVersionId],
    queryFn: () => getApp(id!).then(() => 
      import('@/lib/api').then(m => m.getAppStats(id!, selectedVersionId ?? undefined))
    ),
    enabled: !!id && !!selectedVersionId,
    refetchInterval: 30000,
  });

  const currentModels = modelsByVendor[promptState.vendor] ?? [];

  const activeVersion = versions.find(v => v.id === app?.activeVersionId) || versions[0];
  const initialVersionSampleData = activeVersion?.sampleData ?? app?.sampleData;

  const {
    sampleData,
    setSampleData,
    testResult,
    isTesting,
    testStatus,
    isResultPanelOpen,
    setIsResultPanelOpen,
    runTest,
  } = useTestRunner({ 
    appId: id, 
    versionId: selectedVersionId,
    initialSampleData: initialVersionSampleData,
  });

  useEffect(() => {
    setCurrentSampleData(sampleData);
  }, [sampleData]);

  const handleVersionSelect = useCallback((version: PromptVersion) => {
    handleSelectVersion(version);
    setSampleData(version.sampleData ?? '');
  }, [handleSelectVersion, setSampleData]);

  const nameEdit = useInlineEdit({
    appId: id!,
    field: 'name',
    initialValue: app?.name || '',
    required: true,
  });

  const descriptionEdit = useInlineEdit({
    appId: id!,
    field: 'description',
    initialValue: app?.description || '',
  });

  const { apiKey } = useAppApiKey({ appId: id! });

  const handleDelete = async () => {
    try {
      await deleteApp(id!);
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast.success('App deleted');
      navigate('/');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDeleteVersion = async () => {
    if (!versionToDelete) return;
    try {
      setIsDeletingVersion(true);
      await deletePromptVersion(id!, versionToDelete.id);
      queryClient.invalidateQueries({ queryKey: ['prompts', id] });
      queryClient.invalidateQueries({ queryKey: ['app', id] });
      toast.success(`Version ${versionToDelete.version} deleted`);
      setVersionToDelete(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsDeletingVersion(false);
    }
  };

  const handleTest = () => {
    setViewedResult(null); // Clear any viewed scheduled result
    runTest({
      systemPrompt: promptState.systemPrompt,
      vendor: promptState.vendor as Vendor,
      model: promptState.model,
    });
  };

  const handleResultPanelClose = (open: boolean) => {
    if (!open) {
      setIsResultCollapsed(true);
      setViewedResult(null); // Clear viewed result when closing
    }
    setIsResultPanelOpen(open);
  };

  const handleExpandResult = () => {
    setIsResultPanelOpen(true);
    setIsResultCollapsed(false);
  };

  const handleDevSpaceClose = (open: boolean) => {
    if (!open) {
      setIsDevSpaceCollapsed(true);
    }
    setIsDevSpaceOpen(open);
  };

  const handleExpandDevSpace = () => {
    setIsDevSpaceOpen(true);
    setIsDevSpaceCollapsed(false);
  };

  const handleScheduledRunComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['app-stats', id, selectedVersionId] });
  };

  const handleViewScheduledResult = async (executionLogId: string | null, errorMessage?: string | null) => {
    setScheduledRunError(null);
    setViewedResult(null);
    
    if (errorMessage && !executionLogId) {
      setScheduledRunError(errorMessage);
      setIsResultPanelOpen(true);
      setIsResultCollapsed(false);
      return;
    }
    
    if (!executionLogId) return;
    
    try {
      setIsLoadingResult(true);
      setIsResultPanelOpen(true);
      setIsResultCollapsed(false);
      const log = await getExecutionLog(executionLogId);
      if (log) {
        setViewedResult({
          output: log.output || {},
          rawResponse: log.rawResponse || '',
          latencyMs: log.latencyMs,
          tokenUsage: log.tokenUsage || { prompt: 0, completion: 0, total: 0 },
          error: log.errorMessage,
        });
      }
    } catch (error) {
      toast.error('Failed to load execution result');
    } finally {
      setIsLoadingResult(false);
    }
  };

  if (isLoadingApp) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Loading app...</span>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">App not found</p>
          <Button onClick={() => navigate('/')} className="btn-secondary">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <BackgroundEffects />

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10 slide-up">
        <nav className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 pl-0 gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Apps
          </Button>
        </nav>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {stats && <StatsGrid stats={stats} />}
          <VersionCostStats appId={id!} selectedVersionId={selectedVersionId} />
        </div>

        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <InlineEditField
                value={app.name}
                isEditing={nameEdit.isEditing}
                editValue={nameEdit.editValue}
                inputRef={nameEdit.inputRef}
                onStartEditing={nameEdit.startEditing}
                onSave={nameEdit.saveEdit}
                onCancel={nameEdit.cancelEditing}
                onChange={nameEdit.setEditValue}
                onKeyDown={nameEdit.handleKeyDown}
                variant="title"
              />
            </div>

            <InlineEditField
              value={app.description || ''}
              isEditing={descriptionEdit.isEditing}
              editValue={descriptionEdit.editValue}
              inputRef={descriptionEdit.inputRef}
              onStartEditing={descriptionEdit.startEditing}
              onSave={descriptionEdit.saveEdit}
              onCancel={descriptionEdit.cancelEditing}
              onChange={descriptionEdit.setEditValue}
              onKeyDown={descriptionEdit.handleKeyDown}
              placeholder="Add a description..."
              variant="description"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <VersionSelector
              versions={versions}
              selectedVersionId={selectedVersionId}
              latestVersion={latestVersion}
              onSelectVersion={handleVersionSelect}
              onDeleteVersion={setVersionToDelete}
            />

            <div className="w-px h-6 bg-border mx-1" />

            <ModelSelector
              vendor={promptState.vendor}
              model={promptState.model}
              vendors={vendors}
              models={currentModels}
              onVendorChange={updateVendor}
              onModelChange={updateModel}
            />

            <div className="w-px h-6 bg-border mx-1" />

            <Button
              onClick={handleTest}
              disabled={isTesting || !promptState.systemPrompt.trim()}
              className="btn-secondary gap-2 h-9"
              size="sm"
              title="Execute Prompt"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden lg:inline">Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span className="hidden lg:inline">Execute</span>
                </>
              )}
            </Button>

            <Button
              onClick={handleSave}
              disabled={isSaving || (!isSelectedDifferentFromActive && !promptState.systemPrompt.trim())}
              className="btn-primary gap-2 h-9"
              size="sm"
              title={isSelectedDifferentFromActive ? 'Activate Version' : 'Save Version'}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden lg:inline">{isSelectedDifferentFromActive ? 'Activating...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span className="hidden lg:inline">{isSelectedDifferentFromActive ? 'Activate' : 'Save'}</span>
                </>
              )}
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
              title="Delete App"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <PromptEditor
          systemPrompt={promptState.systemPrompt}
          onSystemPromptChange={updateSystemPrompt}
          sampleData={sampleData}
          onSampleDataChange={setSampleData}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-6">
          <ToolUsagePanel appId={id!} />
          <SchedulePanel appId={id!} sampleData={sampleData} onViewResult={handleViewScheduledResult} onRunComplete={handleScheduledRunComplete} />
        </div>
      </div>

      <ExecutionResultSheet
        isOpen={isResultPanelOpen}
        onOpenChange={handleResultPanelClose}
        isLoading={isTesting || isLoadingResult}
        status={testStatus}
        result={viewedResult || testResult}
        error={scheduledRunError}
      />

      <DevSpaceSheet
        isOpen={isDevSpaceOpen}
        onOpenChange={handleDevSpaceClose}
        appName={app.name}
        appId={id!}
        apiKey={apiKey || undefined}
        interfaces={versions.find(v => v.id === selectedVersionId)?.interfaces}
        latestTestResult={testResult?.output}
        sampleData={sampleData}
      />

      {isResultCollapsed && testResult && (
        <button
          onClick={handleExpandResult}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-4 rounded-l-lg shadow-lg transition-all hover:pr-5 flex flex-col items-center gap-1"
          aria-label="Expand app result"
        >
          <Activity className="w-4 h-4" />
          <span className="text-xs font-medium writing-mode-vertical">Result</span>
        </button>
      )}

      {isDevSpaceCollapsed && (
        <button
          onClick={handleExpandDevSpace}
          className="fixed right-0 top-1/3 -translate-y-1/2 z-40 bg-secondary hover:bg-secondary/90 text-foreground px-3 py-4 rounded-l-lg shadow-lg transition-all hover:pr-5 flex flex-col items-center gap-1"
          aria-label="Expand dev space"
        >
          <Terminal className="w-4 h-4" />
          <span className="text-xs font-medium writing-mode-vertical">Dev</span>
        </button>
      )}

      <DeleteAppDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        appName={app.name}
        onConfirm={handleDelete}
      />

      <DeleteVersionDialog
        version={versionToDelete}
        onOpenChange={() => setVersionToDelete(null)}
        onConfirm={handleDeleteVersion}
        isDeleting={isDeletingVersion}
      />
    </div>
  );
}
