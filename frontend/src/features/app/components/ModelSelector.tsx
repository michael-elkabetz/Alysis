import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VendorOption {
  id: string;
  displayName: string;
}

interface ModelOption {
  id: string;
  displayName: string;
}

interface ModelSelectorProps {
  vendor: string;
  model: string;
  vendors: VendorOption[];
  models: ModelOption[];
  onVendorChange: (vendor: string) => void;
  onModelChange: (model: string) => void;
}

export function ModelSelector({
  vendor,
  model,
  vendors,
  models,
  onVendorChange,
  onModelChange,
}: ModelSelectorProps) {
  return (
    <>
      <Select value={vendor} onValueChange={onVendorChange}>
        <SelectTrigger className="w-36 h-10 bg-secondary border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {vendors.map((v) => (
            <SelectItem key={v.id} value={v.id} className="focus:bg-secondary">
              {v.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={model} onValueChange={onModelChange}>
        <SelectTrigger className="w-44 h-10 bg-secondary border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {models.map((m) => (
            <SelectItem key={m.id} value={m.id} className="focus:bg-secondary">
              {m.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
