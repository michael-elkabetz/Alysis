import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createPromptVersion,
  publishPromptVersion,
  type PromptVersion,
  type Vendor,
  type App,
} from '@/lib/api';

interface PromptState {
  systemPrompt: string;
  vendor: string;
  model: string;
}

interface UsePromptEditorOptions {
  appId: string;
  app: App | undefined;
  versions: PromptVersion[];
  modelsByVendor: Record<string, { id: string; displayName: string }[]>;
}

interface UsePromptEditorReturn {
  promptState: PromptState;
  setPromptState: React.Dispatch<React.SetStateAction<PromptState>>;
  selectedVersionId: string | null;
  selectedVersion: PromptVersion | undefined;
  latestVersion: PromptVersion | undefined;
  isViewingOldVersion: boolean;
  isSelectedDifferentFromActive: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  handleSelectVersion: (version: PromptVersion) => void;
  handleSave: () => Promise<void>;
  updateVendor: (vendor: string) => void;
  updateModel: (model: string) => void;
  updateSystemPrompt: (prompt: string) => void;
}

function inferVendorFromModel(model: string): string {
  if (model.startsWith('claude')) return 'anthropic';
  if (model.startsWith('gemini')) return 'gemini';
  return 'openai';
}

export function usePromptEditor({
  appId,
  app,
  versions,
  modelsByVendor,
}: UsePromptEditorOptions): UsePromptEditorReturn {
  const queryClient = useQueryClient();

  const [promptState, setPromptState] = useState<PromptState>({
    systemPrompt: '',
    vendor: 'openai',
    model: 'gpt-4o',
  });
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const latestVersion = versions[0];
  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  const isViewingOldVersion = Boolean(
    selectedVersionId && latestVersion && selectedVersionId !== latestVersion.id
  );
  const isSelectedDifferentFromActive = Boolean(
    selectedVersionId && app?.activeVersionId && selectedVersionId !== app.activeVersionId
  );

  useEffect(() => {
    if (app && versions.length > 0) {
      const activeVersion =
        versions.find((v) => v.id === app.activeVersionId) || versions[0];

      const vendor = inferVendorFromModel(activeVersion.model);

      setPromptState({
        systemPrompt: activeVersion.systemPrompt,
        vendor,
        model: activeVersion.model,
      });
      setSelectedVersionId(activeVersion.id);
    }
  }, [app, versions]);

  useEffect(() => {
    const vendorModels = modelsByVendor[promptState.vendor];
    if (
      vendorModels &&
      vendorModels.length > 0 &&
      !vendorModels.find((m) => m.id === promptState.model)
    ) {
      setPromptState((prev) => ({ ...prev, model: vendorModels[0].id }));
    }
  }, [promptState.vendor, modelsByVendor, promptState.model]);

  const handleSelectVersion = useCallback((version: PromptVersion) => {
    setSelectedVersionId(version.id);
    const vendor = inferVendorFromModel(version.model);
    setPromptState({
      systemPrompt: version.systemPrompt,
      vendor,
      model: version.model,
    });
  }, []);

  const hasChanges = useCallback((): boolean => {
    if (!latestVersion) return true;
    
    const currentPrompt = promptState.systemPrompt.trim();
    const currentModel = promptState.model;
    const latestPrompt = latestVersion.systemPrompt.trim();
    const latestModel = latestVersion.model;
    
    return currentPrompt !== latestPrompt || currentModel !== latestModel;
  }, [promptState.systemPrompt, promptState.model, latestVersion]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);

      if (isSelectedDifferentFromActive && selectedVersionId) {
        await publishPromptVersion(appId, selectedVersionId);
        queryClient.invalidateQueries({ queryKey: ['app', appId] });
        queryClient.invalidateQueries({ queryKey: ['prompts', appId] });
        toast.success('Version activated');
      } else {
        if (!hasChanges()) {
          toast.info('No changes to save');
          return;
        }
        
        const newVersion = await createPromptVersion(appId, {
          systemPrompt: promptState.systemPrompt,
          vendor: promptState.vendor as Vendor,
          model: promptState.model,
        });
        await publishPromptVersion(appId, newVersion.id);
        queryClient.invalidateQueries({ queryKey: ['app', appId] });
        queryClient.invalidateQueries({ queryKey: ['prompts', appId] });
        toast.success('New version saved');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  }, [appId, isSelectedDifferentFromActive, selectedVersionId, promptState, queryClient, hasChanges]);

  const updateVendor = useCallback((vendor: string) => {
    setPromptState(prev => ({ ...prev, vendor }));
  }, []);

  const updateModel = useCallback((model: string) => {
    setPromptState(prev => ({ ...prev, model }));
  }, []);

  const updateSystemPrompt = useCallback((systemPrompt: string) => {
    setPromptState(prev => ({ ...prev, systemPrompt }));
  }, []);

  const hasUnsavedChanges = hasChanges();

  return {
    promptState,
    setPromptState,
    selectedVersionId,
    selectedVersion,
    latestVersion,
    isViewingOldVersion,
    isSelectedDifferentFromActive,
    isSaving,
    hasUnsavedChanges,
    handleSelectVersion,
    handleSave,
    updateVendor,
    updateModel,
    updateSystemPrompt,
  };
}
