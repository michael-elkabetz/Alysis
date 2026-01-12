import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { testAnalysisPrompt, type Vendor } from '@/lib/api';

interface TestResult {
  output: Record<string, unknown>;
  rawResponse: string;
  latencyMs: number;
  tokenUsage: { prompt: number; completion: number; total: number };
}

interface PromptConfig {
  systemPrompt: string;
  vendor: Vendor;
  model: string;
}

interface UseTestRunnerOptions {
  analysisId?: string;
  onSuccess?: (result: TestResult) => void;
  onError?: (error: Error) => void;
}

interface UseTestRunnerReturn {
  testInput: string;
  setTestInput: (input: string) => void;
  testResult: TestResult | null;
  isTesting: boolean;
  isResultPanelOpen: boolean;
  setIsResultPanelOpen: (open: boolean) => void;
  runTest: (config: PromptConfig) => Promise<void>;
  clearResult: () => void;
}

export function useTestRunner(options: UseTestRunnerOptions = {}): UseTestRunnerReturn {
  const { analysisId, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isResultPanelOpen, setIsResultPanelOpen] = useState(false);

  const runTest = useCallback(async (config: PromptConfig) => {
    if (!testInput.trim()) {
      toast.error('Please enter test input');
      return;
    }

    if (!config.systemPrompt.trim()) {
      toast.error('Please enter analysis instructions');
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      setIsResultPanelOpen(true);

      const result = await testAnalysisPrompt({
        systemPrompt: config.systemPrompt,
        vendor: config.vendor,
        model: config.model,
        input: { data: testInput },
        analysisId,
      });

      setTestResult(result);
      toast.success(`Test completed in ${result.latencyMs}ms`);
      onSuccess?.(result);

      if (analysisId) {
        void queryClient.invalidateQueries({ queryKey: ['analysis-stats', analysisId] });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Test failed');
      toast.error(err.message);
      setIsResultPanelOpen(false);
      onError?.(err);
    } finally {
      setIsTesting(false);
    }
  }, [testInput, analysisId, queryClient, onSuccess, onError]);

  const clearResult = useCallback(() => {
    setTestResult(null);
    setIsResultPanelOpen(false);
  }, []);

  return {
    testInput,
    setTestInput,
    testResult,
    isTesting,
    isResultPanelOpen,
    setIsResultPanelOpen,
    runTest,
    clearResult,
  };
}
