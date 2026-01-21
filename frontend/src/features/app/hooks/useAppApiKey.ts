import { useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getAppApiKeys, regenerateApiKey } from '@/lib/api';

export async function fetchAndRegenerateApiKey(appId: string): Promise<string | null> {
  const keys = await getAppApiKeys(appId);
  if (keys.length > 0) {
    const result = await regenerateApiKey(keys[0].id);
    return result.key;
  }
  return null;
}

export function generateCurlCommand(appId: string, apiKey: string): string {
  return `curl -X POST "${window.location.origin}/api/v1/analyze/${appId}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{"input": {"data": "your data here"}}'`;
}

interface UseAppApiKeyOptions {
  appId: string;
}

interface UseAppApiKeyReturn {
  apiKey: string | null;
  isLoadingKey: boolean;
  copyApiKey: () => Promise<void>;
  copyCurl: () => Promise<void>;
  copyAppId: () => void;
}

export function useAppApiKey({ appId }: UseAppApiKeyOptions): UseAppApiKeyReturn {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadApiKey = async () => {
      try {
        setIsLoadingKey(true);
        const key = await fetchAndRegenerateApiKey(appId);
        if (!cancelled && key) {
          setApiKey(key);
        }
      } catch (error) {
        console.error('Failed to load API key:', error);
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
  }, [appId]);

  const copyApiKey = useCallback(async () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success('API key copied');
      return;
    }

    try {
      const key = await fetchAndRegenerateApiKey(appId);
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
  }, [appId, apiKey]);

  const copyCurl = useCallback(async () => {
    let keyToUse = apiKey;
    
    if (!keyToUse) {
      try {
        keyToUse = await fetchAndRegenerateApiKey(appId);
        if (keyToUse) {
          setApiKey(keyToUse);
        }
      } catch {
        toast.error('No API key found');
        return;
      }
    }

    if (keyToUse) {
      const curl = generateCurlCommand(appId, keyToUse);
      navigator.clipboard.writeText(curl);
      toast.success('cURL copied');
    } else {
      toast.error('No API key found');
    }
  }, [appId, apiKey]);

  const copyAppId = useCallback(() => {
    navigator.clipboard.writeText(appId);
    toast.success('App ID copied');
  }, [appId]);

  return {
    apiKey,
    isLoadingKey,
    copyApiKey,
    copyCurl,
    copyAppId,
  };
}
