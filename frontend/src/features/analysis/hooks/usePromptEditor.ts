import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createPromptVersion,
  publishPromptVersion,
  type PromptVersion,
  type Vendor,
  type Analysis,
} from '@/lib/api';

interface PromptState {
  systemPrompt: string;
  vendor: string;
  model: string;
}

interface UsePromptEditorOptions {
  analysisId: string;
  analysis: Analysis | undefined;
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
  isSaving: boolean;
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
  analysisId,
  analysis,
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

  useEffect(() => {
    if (analysis && versions.length > 0) {
      const activeVersion =
        versions.find((v) => v.id === analysis.activeVersionId) || versions[0];

      const vendor = inferVendorFromModel(activeVersion.model);

      setPromptState({
        systemPrompt: activeVersion.systemPrompt,
        vendor,
        model: activeVersion.model,
      });
      setSelectedVersionId(activeVersion.id);
    }
  }, [analysis, versions]);

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

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);

      if (isViewingOldVersion && selectedVersionId) {
        await publishPromptVersion(analysisId, selectedVersionId);
        queryClient.invalidateQueries({ queryKey: ['analysis', analysisId] });
        queryClient.invalidateQueries({ queryKey: ['prompts', analysisId] });
        toast.success('Version activated');
      } else {
        const newVersion = await createPromptVersion(analysisId, {
          systemPrompt: promptState.systemPrompt,
          vendor: promptState.vendor as Vendor,
          model: promptState.model,
        });
        await publishPromptVersion(analysisId, newVersion.id);
        queryClient.invalidateQueries({ queryKey: ['analysis', analysisId] });
        queryClient.invalidateQueries({ queryKey: ['prompts', analysisId] });
        toast.success('New version saved');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  }, [analysisId, isViewingOldVersion, selectedVersionId, promptState, queryClient]);

  const updateVendor = useCallback((vendor: string) => {
    setPromptState(prev => ({ ...prev, vendor }));
  }, []);

  const updateModel = useCallback((model: string) => {
    setPromptState(prev => ({ ...prev, model }));
  }, []);

  const updateSystemPrompt = useCallback((systemPrompt: string) => {
    setPromptState(prev => ({ ...prev, systemPrompt }));
  }, []);

  return {
    promptState,
    setPromptState,
    selectedVersionId,
    selectedVersion,
    latestVersion,
    isViewingOldVersion,
    isSaving,
    handleSelectVersion,
    handleSave,
    updateVendor,
    updateModel,
    updateSystemPrompt,
  };
}
