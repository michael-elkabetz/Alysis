import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { TypeAnimation } from 'react-type-animation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { VendorOption, ModelOption, VendorKeyStatus } from '@/lib/api';

interface AIHeroProps {
  vendors: VendorOption[];
  modelsByVendor: Record<string, ModelOption[]>;
  vendorKeyStatuses?: VendorKeyStatus[];
  onGenerate: (data: { description: string; vendor: string; model: string }) => void;
  onManual: () => void;
  isGenerating: boolean;
}

export function AIHero({
  vendors,
  modelsByVendor,
  vendorKeyStatuses,
  onGenerate,
  onManual,
  isGenerating,
}: AIHeroProps) {
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [activeTab, setActiveTab] = useState<'magic' | 'manual'>('magic');
  const [isIntroDone, setIsIntroDone] = useState(false);

  useEffect(() => {
    if (!vendor && vendors.length > 0) {
      const configured = vendorKeyStatuses?.find((v) => v.configured && vendors.some(ven => ven.id === v.vendor));
      if (configured) {
        setVendor(configured.vendor);
      }
    }
  }, [vendors, vendorKeyStatuses, vendor]);

  useEffect(() => {
    if (vendor && modelsByVendor[vendor]?.length > 0) {
      if (!model || !modelsByVendor[vendor].some((m) => m.id === model)) {
        setModel(modelsByVendor[vendor][0].id);
      }
    }
  }, [vendor, modelsByVendor, model]);

  const handleTabChange = (tab: 'magic' | 'manual') => {
    setActiveTab(tab);
    if (tab === 'manual') {
      onManual();
      setTimeout(() => setActiveTab('magic'), 200);
    }
  };

  const handleGenerate = () => {
    if (!description.trim()) return;
    onGenerate({ description, vendor, model });
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-16 relative z-20">
      <div className="flex items-center justify-end mb-4">
        <div className="bg-secondary/50 p-1 rounded-full inline-flex" role="tablist" aria-label="App creation mode">
          <button
            onClick={() => handleTabChange('magic')}
            role="tab"
            aria-selected={activeTab === 'magic'}
            aria-label="AI-assisted app creation"
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1.5",
              activeTab === 'magic'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="w-3 h-3 text-primary" />
            AI
          </button>
          <button
            onClick={() => handleTabChange('manual')}
            role="tab"
            aria-selected={activeTab === 'manual'}
            aria-label="Manual app creation"
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
              activeTab === 'manual'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Manual
          </button>
        </div>
      </div>

      <div className={cn(
        "bg-card/80 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden transition-all duration-500",
        "hover:shadow-2xl hover:border-primary/20 group"
      )}>
        <div className="p-1 relative">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder=""
            aria-label="Describe the AI app you want to build"
            className="w-full min-h-[120px] resize-none border-0 bg-transparent text-base placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-5 leading-relaxed relative z-10"
          />
          {!description && (
            <div className="absolute top-5 left-5 text-base text-muted-foreground/50 pointer-events-none select-none flex items-center gap-1 z-0">
              {!isIntroDone ? (
                <TypeAnimation
                  sequence={[
                    'Ask Alysis to Build',
                    () => setIsIntroDone(true),
                  ]}
                  wrapper="span"
                  speed={50}
                  cursor={true}
                  repeat={0}
                />
              ) : (
                <>
                  <span>Ask Alysis to Build</span>
                  <TypeAnimation
                    sequence={[
                      'an Email Tone Analyzer',
                      2000,
                      'a Resume Skills Extractor',
                      2000,
                      'a Product Review Summarizer',
                      2000,
                      'anything - just paste your data',
                      2000,
                    ]}
                    wrapper="span"
                    speed={50}
                    repeat={Infinity}
                    cursor={true}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-secondary/30 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Select value={vendor} onValueChange={setVendor}>
              <SelectTrigger className="h-8 text-xs bg-background/50 border-border/50 hover:bg-background/80 w-[100px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={model} onValueChange={setModel} disabled={!vendor}>
              <SelectTrigger className="h-8 text-xs bg-background/50 border-border/50 hover:bg-background/80 w-[180px]">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {(modelsByVendor[vendor] || []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !description.trim() || !vendor}
            size="sm"
            className={cn(
              "h-8 px-4 rounded-lg font-medium transition-all duration-300",
              "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20",
              isGenerating ? "opacity-80" : "hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
