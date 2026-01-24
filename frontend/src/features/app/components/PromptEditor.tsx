import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PromptEditorProps {
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  sampleData: string;
  onSampleDataChange: (value: string) => void;
}

export function PromptEditor({
  systemPrompt,
  onSystemPromptChange,
  sampleData,
  onSampleDataChange,
}: PromptEditorProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="flex flex-col">
        <Label className="text-sm text-muted-foreground mb-2">
          Analysis Instructions
        </Label>
        <div className="flex-1 editor-panel">
          <Textarea
            className="h-[400px] w-full p-4 bg-transparent border-0 focus-visible:ring-0 text-sm font-mono leading-relaxed text-foreground placeholder:text-muted-foreground/50 resize-none outline-none"
            placeholder="Define the AI behavior here..."
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            spellCheck={false}
            aria-label="System prompt editor"
          />
        </div>
      </div>

      <div className="flex flex-col">
        <Label className="text-sm text-muted-foreground mb-2">User Instructions</Label>
        <div className="flex-1 editor-panel">
          <Textarea
            className="h-[400px] w-full p-4 bg-transparent border-0 focus-visible:ring-0 text-sm font-mono leading-relaxed text-foreground placeholder:text-muted-foreground/50 resize-none outline-none"
            placeholder="Enter user instructions..."
            value={sampleData}
            onChange={(e) => onSampleDataChange(e.target.value)}
            spellCheck={false}
            aria-label="User instructions editor"
          />
        </div>
      </div>
    </div>
  );
}
