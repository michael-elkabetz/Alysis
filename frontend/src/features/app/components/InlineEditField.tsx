import { Check, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InlineEditFieldProps {
  value: string;
  isEditing: boolean;
  editValue: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onStartEditing: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  variant: 'title' | 'description';
}

export function InlineEditField({
  value,
  isEditing,
  editValue,
  inputRef,
  onStartEditing,
  onSave,
  onCancel,
  onChange,
  onKeyDown,
  placeholder,
  variant,
}: InlineEditFieldProps) {
  if (isEditing) {
    const inputClassName = variant === 'title'
      ? 'text-2xl font-semibold h-auto py-1 px-2 bg-secondary border-border'
      : 'text-sm h-auto py-1 px-2 bg-secondary border-border text-muted-foreground';

    const buttonSize = variant === 'title' ? 'h-8 w-8' : 'h-7 w-7';
    const iconSize = variant === 'title' ? 'w-4 h-4' : 'w-3 h-3';

    return (
      <div className="flex items-center gap-2 flex-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={inputClassName}
          placeholder={placeholder}
          autoFocus
          aria-label={variant === 'title' ? 'Edit name' : 'Edit description'}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={onSave}
          className={`${buttonSize} text-green-500 hover:text-green-400 hover:bg-green-500/10`}
          aria-label="Save"
        >
          <Check className={iconSize} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onCancel}
          className={`${buttonSize} text-muted-foreground hover:text-foreground`}
          aria-label="Cancel"
        >
          <X className={iconSize} />
        </Button>
      </div>
    );
  }

  if (variant === 'title') {
    return (
      <h1
        onClick={onStartEditing}
        onKeyDown={(e) => e.key === 'Enter' && onStartEditing()}
        role="button"
        tabIndex={0}
        className="text-2xl font-semibold tracking-tight text-foreground cursor-pointer hover:text-foreground/80 transition-colors group flex items-center gap-2"
        aria-label="Click to edit name"
      >
        {value}
        <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
      </h1>
    );
  }

  return (
    <p
      onClick={onStartEditing}
      onKeyDown={(e) => e.key === 'Enter' && onStartEditing()}
      role="button"
      tabIndex={0}
      className="text-muted-foreground cursor-pointer hover:text-muted-foreground/80 transition-colors group flex items-center gap-2"
      aria-label="Click to edit description"
    >
      {value || (
        <span className="italic text-muted-foreground/50">{placeholder}</span>
      )}
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </p>
  );
}
