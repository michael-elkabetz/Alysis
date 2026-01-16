import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { testAnalysisPrompt, updatePromptInterfaces, updateAnalysis, type Vendor } from '@/lib/api';
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
  analysisId?: string;
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
  const { analysisId, versionId, initialSampleData, onSuccess, onError } = options;
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

      const result = await testAnalysisPrompt({
        systemPrompt: config.systemPrompt,
        vendor: config.vendor,
        model: config.model,
        input: { data: sampleData },
        analysisId,
        versionId: versionId || undefined,
      });

      setTestResult(result);
      toast.success(`Analysis completed in ${formatLatency(result.latencyMs)}`);
      onSuccess?.(result);

      if (analysisId && versionId && result.output) {
        setTestStatus('generating_interfaces');
        const interfaces = generateInterfacesFromOutput(result.output);
        await updatePromptInterfaces(analysisId, versionId, interfaces);
        queryClient.invalidateQueries({ queryKey: ['prompts', analysisId] });
      }

      if (analysisId && sampleData.trim()) {
        updateAnalysis(analysisId, { sampleData })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['analysis', analysisId] });
          })
          .catch(() => {});
      }

      if (analysisId) {
        void queryClient.invalidateQueries({ queryKey: ['analysis-stats', analysisId] });
        void queryClient.invalidateQueries({ queryKey: ['version-cost-stats', analysisId] });
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
  }, [sampleData, analysisId, versionId, queryClient, onSuccess, onError]);

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
