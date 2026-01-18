import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { testAppPrompt, updatePromptInterfaces, updateApp, type Vendor } from '@/lib/api';
import { formatLatency } from '@/lib/utils';
import { generateInterfacesFromOutput } from '@/lib/type-generators';

export { generateInterfacesFromOutput };

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
  appId?: string;
  versionId?: string | null;
  initialSampleData?: string | null;
  onSuccess?: (result: TestResult) => void;
  onError?: (error: Error) => void;
}

export type TestStatus = 'idle' | 'running' | 'generating_interfaces';

interface UseTestRunnerReturn {
  sampleData: string;
  setSampleData: (input: string) => void;
  testResult: TestResult | null;
  isTesting: boolean;
  testStatus: TestStatus;
  isResultPanelOpen: boolean;
  setIsResultPanelOpen: (open: boolean) => void;
  runTest: (config: PromptConfig) => Promise<void>;
  clearResult: () => void;
}

export function useTestRunner(options: UseTestRunnerOptions = {}): UseTestRunnerReturn {
  const { appId, versionId, initialSampleData, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const [sampleData, setSampleData] = useState(initialSampleData || '');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [isResultPanelOpen, setIsResultPanelOpen] = useState(false);

  useEffect(() => {
    if (initialSampleData && !sampleData) {
      setSampleData(initialSampleData);
    }
  }, [initialSampleData, sampleData]);

  const runTest = useCallback(async (config: PromptConfig) => {
    if (!sampleData.trim()) {
      toast.error('Please enter sample data');
      return;
    }

    if (!config.systemPrompt.trim()) {
      toast.error('Please enter analysis instructions');
      return;
    }

    try {
      setIsTesting(true);
      setTestStatus('running');
      setTestResult(null);
      setIsResultPanelOpen(true);

      const result = await testAppPrompt({
        systemPrompt: config.systemPrompt,
        vendor: config.vendor,
        model: config.model,
        input: { data: sampleData },
        appId,
        versionId: versionId || undefined,
      });

      setTestResult(result);
      toast.success(`Analysis completed in ${formatLatency(result.latencyMs)}`);
      onSuccess?.(result);

      if (appId && versionId && result.output) {
        setTestStatus('generating_interfaces');
        const interfaces = generateInterfacesFromOutput(result.output);
        await updatePromptInterfaces(appId, versionId, interfaces);
        queryClient.invalidateQueries({ queryKey: ['prompts', appId] });
      }

      if (appId && sampleData.trim()) {
        updateApp(appId, { sampleData })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['app', appId] });
          })
          .catch(() => {});
      }

      if (appId) {
        void queryClient.invalidateQueries({ queryKey: ['app-stats', appId] });
        void queryClient.invalidateQueries({ queryKey: ['version-cost-stats', appId] });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Test failed');
      toast.error(err.message);
      setIsResultPanelOpen(false);
      onError?.(err);
    } finally {
      setIsTesting(false);
      setTestStatus('idle');
    }
  }, [sampleData, appId, versionId, queryClient, onSuccess, onError]);

  const clearResult = useCallback(() => {
    setTestResult(null);
    setIsResultPanelOpen(false);
  }, []);

  return {
    sampleData,
    setSampleData,
    testResult,
    isTesting,
    testStatus,
    isResultPanelOpen,
    setIsResultPanelOpen,
    runTest,
    clearResult,
  };
}
