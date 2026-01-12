import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateAnalysis } from '@/lib/api';

interface UseInlineEditOptions {
  analysisId: string;
  field: 'name' | 'description';
  initialValue: string;
  required?: boolean;
  onSuccess?: () => void;
}

interface UseInlineEditReturn {
  isEditing: boolean;
  editValue: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  startEditing: () => void;
  cancelEditing: () => void;
  saveEdit: () => Promise<void>;
  setEditValue: (value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useInlineEdit({
  analysisId,
  field,
  initialValue,
  required = false,
  onSuccess,
}: UseInlineEditOptions): UseInlineEditReturn {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const startEditing = useCallback(() => {
    setEditValue(initialValue);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [initialValue]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
  }, []);

  const saveEdit = useCallback(async () => {
    const trimmedValue = editValue.trim();

    if (required && !trimmedValue) {
      toast.error(`${field.charAt(0).toUpperCase() + field.slice(1)} cannot be empty`);
      return;
    }

    try {
      await updateAnalysis(analysisId, {
        [field]: trimmedValue || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['analysis', analysisId] });
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      setIsEditing(false);
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
      onSuccess?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [analysisId, field, editValue, required, queryClient, onSuccess]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  }, [saveEdit, cancelEditing]);

  return {
    isEditing,
    editValue,
    inputRef,
    startEditing,
    cancelEditing,
    saveEdit,
    setEditValue,
    handleKeyDown,
  };
}
