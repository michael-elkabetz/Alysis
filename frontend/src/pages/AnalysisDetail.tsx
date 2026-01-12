import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Play, Activity, Loader2, Terminal } from 'lucide-react';
import {
  getAnalysis,
  getPromptVersions,
  deletePromptVersion,
  getVendorsAndModels,
  deleteAnalysis,
  type AnalysisStats,
  type PromptVersion,
  type Vendor,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import BackgroundEffects from '@/layouts/BackgroundEffects';
import {
  StatsGrid,
  PromptEditor,
  DeleteAppDialog,
  DeleteVersionDialog,
  VersionSelector,
  ModelSelector,
  InlineEditField,
  AppActionsMenu,
  VersionCostStats,
  TestResultSheet,
  DevSpaceSheet,
  VersionCostKPI,
} from '@/features/analysis/components';
import {
  useTestRunner,
  usePromptEditor,
  useInlineEdit,
  useAnalysisApiKey,
} from '@/features/analysis/hooks';

export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<PromptVersion | null>(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const [isResultCollapsed, setIsResultCollapsed] = useState(false);
  const [isDevSpaceOpen, setIsDevSpaceOpen] = useState(false);
  const [isDevSpaceCollapsed, setIsDevSpaceCollapsed] = useState(false);

  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => getAnalysis(id!),
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

  const { data: stats } = useQuery<AnalysisStats>({
    queryKey: ['analysis-stats', id],
    queryFn: () => getAnalysis(id!).then(() => 
      import('@/lib/api').then(m => m.getAnalysisStats(id!))
    ),
    enabled: !!id,
    refetchInterval: 30000,
  });

  const vendors = vendorsData?.vendors ?? [];
  const modelsByVendor = vendorsData?.modelsByVendor ?? {};

  const {
    promptState,
    selectedVersionId,
    latestVersion,
    isSaving,
    handleSelectVersion,
    handleSave,
    updateVendor,
    updateModel,
    updateSystemPrompt,
  } = usePromptEditor({
    analysisId: id!,
    analysis,
    versions,
    modelsByVendor,
  });

  const currentModels = modelsByVendor[promptState.vendor] ?? [];

  const {
    testInput,
    setTestInput,
    testResult,
    isTesting,
    isResultPanelOpen,
    setIsResultPanelOpen,
    runTest,
  } = useTestRunner({ analysisId: id });

  const nameEdit = useInlineEdit({
    analysisId: id!,
    field: 'name',
    initialValue: analysis?.name || '',
    required: true,
  });

  const descriptionEdit = useInlineEdit({
    analysisId: id!,
    field: 'description',
    initialValue: analysis?.description || '',
  });

  const { copyApiKey, copyCurl, copyAppId } = useAnalysisApiKey({ analysisId: id! });

  const handleDelete = async () => {
    try {
      await deleteAnalysis(id!);
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
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
      queryClient.invalidateQueries({ queryKey: ['analysis', id] });
      toast.success(`Version ${versionToDelete.version} deleted`);
      setVersionToDelete(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsDeletingVersion(false);
    }
  };

  const handleTest = () => {
    runTest({
      systemPrompt: promptState.systemPrompt,
      vendor: promptState.vendor as Vendor,
      model: promptState.model,
    });
  };

  const handleResultPanelClose = (open: boolean) => {
    if (!open) {
      setIsResultCollapsed(true);
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

  if (isLoadingAnalysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Loading app...</span>
        </div>
      </div>
    );
  }

  if (!analysis) {
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

        {stats && <StatsGrid stats={stats} />}

        <div className="mb-8">
          <VersionCostStats analysisId={id!} />
        </div>

        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <InlineEditField
                value={analysis.name}
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
              value={analysis.description || ''}
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

          <div className="flex items-center gap-3">
            <VersionSelector
              versions={versions}
              selectedVersionId={selectedVersionId}
              latestVersion={latestVersion}
              onSelectVersion={handleSelectVersion}
              onDeleteVersion={setVersionToDelete}
            />

            <ModelSelector
              vendor={promptState.vendor}
              model={promptState.model}
              vendors={vendors}
              models={currentModels}
              onVendorChange={updateVendor}
              onModelChange={updateModel}
            />

            <AppActionsMenu
              onCopyAppId={copyAppId}
              onCopyApiKey={copyApiKey}
              onCopyCurl={copyCurl}
              onDelete={() => setShowDeleteDialog(true)}
            />
          </div>
        </header>

        <div className="mb-6">
          <VersionCostKPI analysisId={id!} selectedVersionId={selectedVersionId} />
        </div>

        <PromptEditor
          systemPrompt={promptState.systemPrompt}
          onSystemPromptChange={updateSystemPrompt}
          testInput={testInput}
          onTestInputChange={setTestInput}
        />

        <div className="flex items-center justify-between gap-3">
          <Button
            onClick={() => setIsDevSpaceOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Terminal className="w-4 h-4" />
            Developer Space
          </Button>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleTest}
              disabled={isTesting || !testInput.trim() || !promptState.systemPrompt.trim()}
              className="btn-secondary gap-2"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Test
                </>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !promptState.systemPrompt.trim()}
              className="btn-primary gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <TestResultSheet
        isOpen={isResultPanelOpen}
        onOpenChange={handleResultPanelClose}
        isLoading={isTesting}
        result={testResult}
      />

      <DevSpaceSheet
        isOpen={isDevSpaceOpen}
        onOpenChange={handleDevSpaceClose}
        analysisName={analysis.name}
        analysisId={id!}
        latestTestResult={testResult?.output}
      />

      {isResultCollapsed && testResult && (
        <button
          onClick={handleExpandResult}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-4 rounded-l-lg shadow-lg transition-all hover:pr-5 flex flex-col items-center gap-1"
          aria-label="Expand test result"
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
        appName={analysis.name}
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
