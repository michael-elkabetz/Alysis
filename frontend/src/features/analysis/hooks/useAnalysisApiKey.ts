import { useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getAnalysisApiKeys, regenerateApiKey } from '@/lib/api';

export async function fetchAndRegenerateApiKey(analysisId: string): Promise<string | null> {
  const keys = await getAnalysisApiKeys(analysisId);
  if (keys.length > 0) {
    const result = await regenerateApiKey(keys[0].id);
    return result.key;
  }
  return null;
}

export function generateCurlCommand(analysisId: string, apiKey: string): string {
  return `curl -X POST "${window.location.origin}/api/v1/analyze/${analysisId}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{"input": {"data": "your data here"}}'`;
}

interface UseAnalysisApiKeyOptions {
  analysisId: string;
}

interface UseAnalysisApiKeyReturn {
  apiKey: string | null;
  isLoadingKey: boolean;
  copyApiKey: () => Promise<void>;
  copyCurl: () => Promise<void>;
  copyAppId: () => void;
}

export function useAnalysisApiKey({ analysisId }: UseAnalysisApiKeyOptions): UseAnalysisApiKeyReturn {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadApiKey = async () => {
      try {
        setIsLoadingKey(true);
        const key = await fetchAndRegenerateApiKey(analysisId);
        if (!cancelled && key) {
          setApiKey(key);
        }
      } catch {
      } finally {
        if (!cancelled) {
          setIsLoadingKey(false);
        }
      }
    };

    loadApiKey();

    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const copyApiKey = useCallback(async () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success('API key copied');
      return;
    }

    try {
      const key = await fetchAndRegenerateApiKey(analysisId);
      if (key) {
        setApiKey(key);
        navigator.clipboard.writeText(key);
        toast.success('New API key generated and copied');
      } else {
        toast.error('No API key found');
      }
    } catch {
      toast.error('Failed to get API key');
    }
  }, [analysisId, apiKey]);

  const copyCurl = useCallback(async () => {
    let keyToUse = apiKey;
    
    if (!keyToUse) {
      try {
        keyToUse = await fetchAndRegenerateApiKey(analysisId);
        if (keyToUse) {
          setApiKey(keyToUse);
        }
      } catch {
        toast.error('No API key found');
        return;
      }
    }

    if (keyToUse) {
      const curl = generateCurlCommand(analysisId, keyToUse);
      navigator.clipboard.writeText(curl);
      toast.success('cURL copied');
    } else {
      toast.error('No API key found');
    }
  }, [analysisId, apiKey]);

  const copyAppId = useCallback(() => {
    navigator.clipboard.writeText(analysisId);
    toast.success('App ID copied');
  }, [analysisId]);

  return {
    apiKey,
    isLoadingKey,
    copyApiKey,
    copyCurl,
    copyAppId,
  };
}
