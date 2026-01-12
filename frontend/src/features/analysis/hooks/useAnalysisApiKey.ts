import { useCallback } from 'react';
import { toast } from 'sonner';
import { getAnalysisApiKeys, regenerateApiKey } from '@/lib/api';

interface UseAnalysisApiKeyOptions {
  analysisId: string;
}

interface UseAnalysisApiKeyReturn {
  copyApiKey: () => Promise<void>;
  copyCurl: () => Promise<void>;
  copyAppId: () => void;
}

export function useAnalysisApiKey({ analysisId }: UseAnalysisApiKeyOptions): UseAnalysisApiKeyReturn {
  const copyApiKey = useCallback(async () => {
    try {
      const keys = await getAnalysisApiKeys(analysisId);
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
  }, [analysisId]);

  const copyCurl = useCallback(async () => {
    try {
      const keys = await getAnalysisApiKeys(analysisId);
      if (keys.length > 0) {
        const result = await regenerateApiKey(keys[0].id);
        const curl = `curl -X POST "${window.location.origin}/api/v1/analyze/${analysisId}" \\
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
  }, [analysisId]);

  const copyAppId = useCallback(() => {
    navigator.clipboard.writeText(analysisId);
    toast.success('App ID copied');
  }, [analysisId]);

  return {
    copyApiKey,
    copyCurl,
    copyAppId,
  };
}
