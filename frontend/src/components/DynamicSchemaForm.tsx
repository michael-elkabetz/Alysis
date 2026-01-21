import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { JsonSchema, JsonSchemaProperty } from '@/lib/api';

interface DynamicSchemaFormProps {
  schema: JsonSchema;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  existingValues?: Record<string, unknown>;
  disabled?: boolean;
}

export function DynamicSchemaForm({
  schema,
  values,
  onChange,
  existingValues,
  disabled = false,
}: DynamicSchemaFormProps) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...values, [field]: value });
  };

  const isRequired = (field: string) => schema.required?.includes(field) ?? false;

  const propertiesArray = Object.entries(schema.properties);
  
  const passwordIndex = propertiesArray.findIndex(([key]) => key === 'password');
  const warehouseIndex = propertiesArray.findIndex(([key]) => key === 'warehouse');
  
  if (passwordIndex !== -1 && warehouseIndex !== -1) {
    [propertiesArray[passwordIndex], propertiesArray[warehouseIndex]] = 
      [propertiesArray[warehouseIndex], propertiesArray[passwordIndex]];
  }
  
  const updatedWarehouseIndex = propertiesArray.findIndex(([key]) => key === 'warehouse');
  const updatedSchemaIndex = propertiesArray.findIndex(([key]) => key === 'schema');
  if (updatedSchemaIndex !== -1 && updatedWarehouseIndex !== -1) {
    [propertiesArray[updatedSchemaIndex], propertiesArray[updatedWarehouseIndex]] = 
      [propertiesArray[updatedWarehouseIndex], propertiesArray[updatedSchemaIndex]];
  }
  
  const sortedProperties = propertiesArray.sort(([keyA], [keyB]) => {
    if (keyA === 'privateKeyPassword' && keyB === 'privateKey') return -1;
    if (keyA === 'privateKey' && keyB === 'privateKeyPassword') return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {sortedProperties.map(([key, prop]) => (
          <div key={key} className={cn(prop.format === 'textarea' ? 'col-span-2' : '', 'p-0.5')}>
            <SchemaField
              fieldKey={key}
              property={prop}
              value={values[key]}
              existingValue={existingValues?.[key]}
              onChange={(value) => updateField(key, value)}
              required={isRequired(key)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface SchemaFieldProps {
  fieldKey: string;
  property: JsonSchemaProperty;
  value: unknown;
  existingValue?: unknown;
  onChange: (value: unknown) => void;
  required: boolean;
  disabled?: boolean;
}

function SchemaField({
  fieldKey,
  property,
  value,
  existingValue,
  onChange,
  required,
  disabled,
}: SchemaFieldProps) {
  const [showSecret, setShowSecret] = useState(false);
  const label = formatFieldLabel(fieldKey);
  const isSecret = isSecretField(fieldKey, property);
  const hasExistingValue = existingValue !== undefined && existingValue !== null && existingValue !== '';

  let placeholder = property.description || '';
  if (isSecret && hasExistingValue && !value) {
    placeholder = 'Leave empty to keep existing';
  }

  if (property.type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldKey} className="text-xs cursor-pointer">
          {label}
        </Label>
        <Switch
          id={fieldKey}
          checked={value as boolean ?? property.default as boolean ?? false}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      </div>
    );
  }

  if (property.enum) {
    return (
      <div>
        <Label htmlFor={fieldKey} className="text-xs">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <Select
          value={value as string ?? property.default as string ?? ''}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={placeholder || `Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {property.enum.map((option) => (
              <SelectItem key={option} value={option}>
                {formatEnumLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (property.format === 'textarea') {
    return (
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor={fieldKey} className="text-xs">
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
          {isSecret && (
             <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="h-4 p-0 text-[10px] text-muted-foreground hover:text-foreground"
            >
                {showSecret ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {showSecret ? 'Hide' : 'Show'}
            </Button>
         )}
        </div>
        <Textarea
          id={fieldKey}
          placeholder={placeholder}
          value={value as string ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'font-mono text-xs min-h-[80px] resize-none mt-1',
            isSecret && !showSecret && !!value && 'text-security-disc'
          )}
          style={isSecret && !showSecret && value ? { WebkitTextSecurity: 'disc' } as React.CSSProperties : undefined}
        />
      </div>
    );
  }

  if (property.type === 'number') {
    const defaultValue = property.default as number | undefined;
    const displayValue = value !== undefined && value !== null ? value as number : defaultValue ?? '';
    return (
      <div>
        <Label htmlFor={fieldKey} className="text-xs">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id={fieldKey}
          type="number"
          placeholder={placeholder || defaultValue?.toString()}
          value={displayValue}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          disabled={disabled}
          min={property.minimum}
          max={property.maximum}
          className="h-9 text-sm"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
         <Label htmlFor={fieldKey} className="text-xs">
            {label} {required && <span className="text-red-500">*</span>}
         </Label>
         {isSecret && (
             <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="h-4 p-0 text-[10px] text-muted-foreground hover:text-foreground"
            >
                {showSecret ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {showSecret ? 'Hide' : 'Show'}
            </Button>
         )}
      </div>
     
      <Input
        id={fieldKey}
        type={isSecret && !showSecret ? 'password' : 'text'}
        placeholder={placeholder}
        value={value as string ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-9 text-sm mt-1"
      />
    </div>
  );
}

function isSecretField(key: string, property: JsonSchemaProperty): boolean {
  const keyLower = key.toLowerCase();
  return (
    property.format === 'password' ||
    keyLower.includes('password') ||
    keyLower.includes('secret') ||
    keyLower.includes('token') ||
    (keyLower.includes('key') && !keyLower.includes('header'))
  );
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function formatEnumLabel(value: string): string {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}
