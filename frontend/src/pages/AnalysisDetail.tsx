import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Play,
  Activity,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  X,
  Key,
  Terminal,
  Copy,
  FlaskConical,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Gauge,
  Coins,
  History,
} from "lucide-react";
import {
  getAnalysis,
  getPromptVersions,
  createPromptVersion,
  publishPromptVersion,
  deletePromptVersion,
  getVendorsAndModels,
  testAnalysisPrompt,
  updateAnalysis,
  deleteAnalysis,
  getAnalysisApiKeys,
  regenerateApiKey,
  getAnalysisStats,
  type AnalysisStats,
  type PromptVersion,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import BackgroundEffects from "@/components/BackgroundEffects";

export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<{
    output: Record<string, unknown>;
    rawResponse: string;
    latencyMs: number;
    tokenUsage: { prompt: number; completion: number; total: number };
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResultPanel, setShowResultPanel] = useState(false);
  const [isResultCollapsed, setIsResultCollapsed] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionToDelete, setVersionToDelete] = useState<PromptVersion | null>(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  const [promptState, setPromptState] = useState({
    systemPrompt: "",
    vendor: "openai",
    model: "gpt-4o",
  });

  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => getAnalysis(id!),
    enabled: !!id,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["prompts", id],
    queryFn: () => getPromptVersions(id!),
    enabled: !!id,
  });

  const { data: vendorsData } = useQuery({
    queryKey: ["vendors-models"],
    queryFn: getVendorsAndModels,
  });

  const { data: stats } = useQuery<AnalysisStats>({
    queryKey: ["analysis-stats", id],
    queryFn: () => getAnalysisStats(id!),
    enabled: !!id,
    refetchInterval: 30000,
  });

  const vendors = vendorsData?.vendors ?? [];
  const modelsByVendor = vendorsData?.modelsByVendor ?? {};
  const currentModels = modelsByVendor[promptState.vendor] ?? [];

  useEffect(() => {
    if (analysis && versions.length > 0) {
      const activeVersion =
        versions.find((v) => v.id === analysis.activeVersionId) || versions[0];

      let vendor = "openai";
      if (activeVersion.model.startsWith("claude")) {
        vendor = "anthropic";
      } else if (activeVersion.model.startsWith("gemini")) {
        vendor = "gemini";
      }

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
  }, [promptState.vendor, modelsByVendor]);

  const latestVersion = versions[0];
  const isViewingOldVersion = selectedVersionId && latestVersion && selectedVersionId !== latestVersion.id;
  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // If viewing an old version, just activate it instead of creating new
      if (isViewingOldVersion && selectedVersionId) {
        await publishPromptVersion(id!, selectedVersionId);
        queryClient.invalidateQueries({ queryKey: ["analysis", id] });
        queryClient.invalidateQueries({ queryKey: ["prompts", id] });
        toast.success("Version activated");
      } else {
        // Create new version
        const newVersion = await createPromptVersion(id!, {
          systemPrompt: promptState.systemPrompt,
          vendor: promptState.vendor as "openai" | "anthropic" | "gemini",
          model: promptState.model,
        });
        await publishPromptVersion(id!, newVersion.id);
        queryClient.invalidateQueries({ queryKey: ["analysis", id] });
        queryClient.invalidateQueries({ queryKey: ["prompts", id] });
        toast.success("New version saved");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingName = () => {
    setEditName(analysis?.name || "");
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const startEditingDescription = () => {
    setEditDescription(analysis?.description || "");
    setIsEditingDescription(true);
    setTimeout(() => descriptionInputRef.current?.focus(), 0);
  };

  const saveNameEdit = async () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    try {
      await updateAnalysis(id!, { name: editName.trim() });
      queryClient.invalidateQueries({ queryKey: ["analysis", id] });
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      setIsEditingName(false);
      toast.success("Name updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const saveDescriptionEdit = async () => {
    try {
      await updateAnalysis(id!, {
        description: editDescription.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["analysis", id] });
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      setIsEditingDescription(false);
      toast.success("Description updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const cancelNameEdit = () => {
    setIsEditingName(false);
    setEditName("");
  };

  const cancelDescriptionEdit = () => {
    setIsEditingDescription(false);
    setEditDescription("");
  };

  const handleDelete = async () => {
    try {
      await deleteAnalysis(id!);
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      toast.success("App deleted");
      navigate("/");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveNameEdit();
    } else if (e.key === "Escape") {
      cancelNameEdit();
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveDescriptionEdit();
    } else if (e.key === "Escape") {
      cancelDescriptionEdit();
    }
  };

  const handleTest = async () => {
    if (!testInput.trim()) {
      toast.error("Please enter test input");
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      setShowResultPanel(true);
      setIsResultCollapsed(false);
      const result = await testAnalysisPrompt({
        systemPrompt: promptState.systemPrompt,
        vendor: promptState.vendor as "openai" | "anthropic" | "gemini",
        model: promptState.model,
        input: { data: testInput },
        analysisId: id,
      });
      setTestResult(result);
      toast.success(`Test completed in ${result.latencyMs}ms`);
    } catch (e) {
      toast.error((e as Error).message);
      setShowResultPanel(false);
    } finally {
      setIsTesting(false);
      void queryClient.invalidateQueries({ queryKey: ["analysis-stats", id] });
    }
  };

  const handleCopyApiKey = async () => {
    try {
      const keys = await getAnalysisApiKeys(id!);
      if (keys.length > 0) {
        const result = await regenerateApiKey(keys[0].id);
        navigator.clipboard.writeText(result.key);
        toast.success("New API key generated and copied");
      } else {
        toast.error("No API key found");
      }
    } catch {
      toast.error("Failed to get API key");
    }
  };

  const handleCopyCurl = async () => {
    try {
      const keys = await getAnalysisApiKeys(id!);
      if (keys.length > 0) {
        const result = await regenerateApiKey(keys[0].id);
        const curl = `curl -X POST "${window.location.origin}/api/v1/analyze/${id}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${result.key}" \\
  -d '{"input": {"data": "your data here"}}'`;
        navigator.clipboard.writeText(curl);
        toast.success("cURL with new API key copied");
      } else {
        toast.error("No API key found");
      }
    } catch {
      toast.error("Failed to generate cURL");
    }
  };

  const handleCopyAppId = () => {
    navigator.clipboard.writeText(id!);
    toast.success("App ID copied");
  };

  const handleSelectVersion = (version: PromptVersion) => {
    setSelectedVersionId(version.id);
    let vendor = "openai";
    if (version.model.startsWith("claude")) {
      vendor = "anthropic";
    } else if (version.model.startsWith("gemini")) {
      vendor = "gemini";
    }
    setPromptState({
      systemPrompt: version.systemPrompt,
      vendor,
      model: version.model,
    });
  };

  const handleDeleteVersion = async () => {
    if (!versionToDelete) return;
    try {
      setIsDeletingVersion(true);
      await deletePromptVersion(id!, versionToDelete.id);
      queryClient.invalidateQueries({ queryKey: ["prompts", id] });
      queryClient.invalidateQueries({ queryKey: ["analysis", id] });
      toast.success(`Version ${versionToDelete.version} deleted`);
      setVersionToDelete(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsDeletingVersion(false);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 2) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const handleResultPanelClose = (open: boolean) => {
    if (!open) {
      setIsResultCollapsed(true);
    }
    setShowResultPanel(open);
  };

  const handleExpandResult = () => {
    setShowResultPanel(true);
    setIsResultCollapsed(false);
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
          <Button onClick={() => navigate("/")} className="btn-secondary">
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
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 pl-0 gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Apps
          </Button>
        </nav>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="stat-card rounded-xl border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Total Hits
                </span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {stats.totalExecutions.toLocaleString()}
              </p>
            </div>
            <div className="stat-card rounded-xl border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground">
                  Success Rate
                </span>
              </div>
              <p className="text-xl font-semibold text-emerald-400">
                {stats.totalExecutions > 0
                  ? `${((stats.successCount / stats.totalExecutions) * 100).toFixed(1)}%`
                  : "—"}
              </p>
            </div>
            <div className="stat-card rounded-xl border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-muted-foreground">Failures</span>
              </div>
              <p className="text-xl font-semibold text-red-400">
                {stats.errorCount.toLocaleString()}
              </p>
            </div>
            <div className="stat-card rounded-xl border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">
                  Avg Latency
                </span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {stats.avgLatencyMs > 0
                  ? stats.avgLatencyMs < 1000
                    ? `${Math.round(stats.avgLatencyMs)}ms`
                    : `${(stats.avgLatencyMs / 1000).toFixed(1)}s`
                  : "—"}
              </p>
            </div>
            <div className="stat-card rounded-xl border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-muted-foreground">
                  Total Tokens
                </span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {stats.totalTokens > 1000000
                  ? `${(stats.totalTokens / 1000000).toFixed(1)}M`
                  : stats.totalTokens > 1000
                    ? `${(stats.totalTokens / 1000).toFixed(1)}K`
                    : stats.totalTokens.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isEditingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    ref={nameInputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    className="text-2xl font-semibold h-auto py-1 px-2 bg-secondary border-border"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={saveNameEdit}
                    className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={cancelNameEdit}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <h1
                  onClick={startEditingName}
                  className="text-2xl font-semibold tracking-tight text-foreground cursor-pointer hover:text-foreground/80 transition-colors group flex items-center gap-2"
                >
                  {analysis.name}
                  <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                </h1>
              )}
            </div>

            {isEditingDescription ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={descriptionInputRef}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onKeyDown={handleDescriptionKeyDown}
                  placeholder="Add a description..."
                  className="text-sm h-auto py-1 px-2 bg-secondary border-border text-muted-foreground"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={saveDescriptionEdit}
                  className="h-7 w-7 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={cancelDescriptionEdit}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <p
                onClick={startEditingDescription}
                className="text-muted-foreground cursor-pointer hover:text-muted-foreground/80 transition-colors group flex items-center gap-2"
              >
                {analysis.description || (
                  <span className="italic text-muted-foreground/50">
                    Add a description...
                  </span>
                )}
                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Version Dropdown */}
            {versions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 gap-2 bg-secondary/50 border-border hover:bg-secondary hover:border-primary/30 transition-all"
                  >
                    <History className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      v{selectedVersion?.version || latestVersion?.version}
                    </span>
                    {selectedVersion?.id === latestVersion?.id && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/20 text-primary">
                        Latest
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-card border-border w-64"
                >
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Version History
                  </div>
                  <DropdownMenuSeparator />
                  {versions.map((version, index) => {
                    const isLatest = index === 0;
                    const isSelected = version.id === selectedVersionId;
                    return (
                      <DropdownMenuItem
                        key={version.id}
                        onClick={() => handleSelectVersion(version)}
                        className={`cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected ? "bg-primary/10" : "focus:bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`font-medium ${isSelected ? "text-primary" : ""}`}>
                            v{version.version}
                          </span>
                          {isLatest && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/20 text-primary">
                              Latest
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(version.createdAt)}
                          </span>
                        </div>
                        {versions.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setVersionToDelete(version);
                            }}
                            className="p-1 hover:bg-red-500/10 rounded opacity-50 hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-400" />
                          </button>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Select
              value={promptState.vendor}
              onValueChange={(v) =>
                setPromptState({ ...promptState, vendor: v })
              }
            >
              <SelectTrigger className="w-36 h-10 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {vendors.map((vendor) => (
                  <SelectItem
                    key={vendor.id}
                    value={vendor.id}
                    className="focus:bg-secondary"
                  >
                    {vendor.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={promptState.model}
              onValueChange={(v) =>
                setPromptState({ ...promptState, model: v })
              }
            >
              <SelectTrigger className="w-44 h-10 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {currentModels.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    className="focus:bg-secondary"
                  >
                    {model.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  <MoreVertical className="w-5 h-5" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-card border-border"
              >
                <DropdownMenuItem
                  onClick={handleCopyAppId}
                  className="cursor-pointer focus:bg-secondary"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy App ID
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopyApiKey}
                  className="cursor-pointer focus:bg-secondary"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Copy API Key
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopyCurl}
                  className="cursor-pointer focus:bg-secondary"
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  Copy cURL
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete app
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col">
            <Label className="text-sm text-muted-foreground mb-2">
              Analysis Instructions
            </Label>

            <div className="flex-1 editor-panel">
              <Textarea
                className="h-[400px] w-full p-4 bg-transparent border-0 focus-visible:ring-0 text-sm font-mono leading-relaxed text-foreground placeholder:text-muted-foreground/50 resize-none outline-none"
                placeholder="Define the AI behavior here..."
                value={promptState.systemPrompt}
                onChange={(e) =>
                  setPromptState({
                    ...promptState,
                    systemPrompt: e.target.value,
                  })
                }
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex flex-col">
            <Label className="text-sm text-muted-foreground mb-2">
              Test Input
            </Label>
            <div className="flex-1 editor-panel">
              <Textarea
                className="h-[400px] w-full p-4 bg-transparent border-0 focus-visible:ring-0 text-sm font-mono leading-relaxed text-foreground placeholder:text-muted-foreground/50 resize-none outline-none"
                placeholder="Enter test data..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button
            onClick={handleTest}
            disabled={
              isTesting || !testInput.trim() || !promptState.systemPrompt.trim()
            }
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

      <Sheet open={showResultPanel} onOpenChange={handleResultPanelClose}>
        <SheetContent
          side="right"
          className="w-[500px] sm:max-w-[500px] bg-card border-border p-0 flex flex-col"
        >
          <SheetHeader className="px-6 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <FlaskConical className="w-4 h-4 text-primary" />
                </div>
                <SheetTitle className="text-lg">Test Result</SheetTitle>
                {testResult && (
                  <div className="flex items-center gap-1.5 ml-2">
                    {testResult.latencyMs < 1000 ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Zap className="w-3 h-3" />
                        {testResult.latencyMs}ms
                      </span>
                    ) : testResult.latencyMs < 3000 ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        {(testResult.latencyMs / 1000).toFixed(1)}s
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <Clock className="w-3 h-3" />
                        {(testResult.latencyMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {testResult && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-muted-foreground/60">Tokens:</span>
                  <span className="font-medium text-foreground">
                    {testResult.tokenUsage.total.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground/40">
                    ({testResult.tokenUsage.prompt} in /{" "}
                    {testResult.tokenUsage.completion} out)
                  </span>
                </div>
              </div>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-auto p-6">
            {isTesting ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Running test...
              </div>
            ) : testResult ? (
              <div className="editor-panel p-4 h-full overflow-auto">
                <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-words overflow-y-auto">
                  {typeof testResult.output === "object"
                    ? JSON.stringify(testResult.output, null, 2)
                    : testResult.rawResponse}
                </pre>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground/50">
                No result yet
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {isResultCollapsed && testResult && (
        <button
          onClick={handleExpandResult}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-4 rounded-l-lg shadow-lg transition-all hover:pr-5 flex flex-col items-center gap-1"
        >
          <Activity className="w-4 h-4" />
          <span className="text-xs font-medium writing-mode-vertical">
            Result
          </span>
        </button>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete App</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{analysis.name}"? This action
              cannot be undone. All associated prompt versions and execution
              logs will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border hover:bg-secondary/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!versionToDelete} onOpenChange={(open) => !open && setVersionToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete version {versionToDelete?.version}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border hover:bg-secondary/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVersion}
              disabled={isDeletingVersion}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingVersion ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
