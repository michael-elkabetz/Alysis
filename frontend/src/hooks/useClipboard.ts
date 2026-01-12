import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseClipboardOptions {
  successMessage?: string;
  errorMessage?: string;
  resetDelay?: number;
}

interface UseClipboardReturn {
  copy: (text: string) => Promise<boolean>;
  isCopied: boolean;
}

export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
  const {
    successMessage = 'Copied to clipboard',
    errorMessage = 'Failed to copy',
    resetDelay = 2000,
  } = options;

  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (!text) {
      toast.error('Nothing to copy');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success(successMessage);

      setTimeout(() => {
        setIsCopied(false);
      }, resetDelay);

      return true;
    } catch {
      toast.error(errorMessage);
      return false;
    }
  }, [successMessage, errorMessage, resetDelay]);

  return { copy, isCopied };
}
