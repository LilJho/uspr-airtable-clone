"use client";
import { useMemo, useState } from "react";
import type { FieldRow } from "@/lib/types/base-detail";

export default function CellEditor({
  field,
  value,
  recordId,
  onUpdate,
  isSaving,
}: {
  field: FieldRow;
  value: unknown;
  recordId: string;
  onUpdate: (val: unknown) => void;
  isSaving?: boolean;
}) {
  const [local, setLocal] = useState<string>(() => (value == null ? "" : String(value)));
  const [emailError, setEmailError] = useState<string | null>(null);

  type SelectOptions = { choices?: string[] } | Record<string, { label: string; color: string }>;
  
  const defaultChoiceColors = ['#3b82f6', '#eab308', '#ef4444']; // blue, yellow, red
  
  const selectChoices = useMemo(() => {
    if (field.type === 'single_select' || field.type === 'multi_select') {
      const options = field.options as SelectOptions | null | undefined;
      
      // Handle new format: { optionId: { label: string, color: string } }
      if (options && typeof options === 'object' && !Array.isArray(options)) {
        const hasNewFormat = Object.values(options).some(val => 
          typeof val === 'object' && val !== null && 'label' in val
        );
        
        if (hasNewFormat) {
          return Object.entries(options).map(([key, option]) => ({
            key,
            label: (option as { label: string; color: string }).label,
            color: (option as { label: string; color: string }).color
          }));
        }
      }
      
      // Handle old format: { choices: string[] }
      const choices = (options as { choices?: string[] })?.choices;
      if (Array.isArray(choices)) {
        return choices.map((choice, idx) => ({
          key: choice,
          label: choice,
          color: defaultChoiceColors[idx % defaultChoiceColors.length]
        }));
      }
    }
    return [];
  }, [field]);
  const choiceColors = useMemo(() => {
    if (field.type !== 'single_select' && field.type !== 'multi_select') return {} as Record<string, string>;
    
    const map: Record<string, string> = {};
    selectChoices.forEach((choice) => {
      map[choice.key] = choice.color;
    });
    return map;
  }, [field, selectChoices]);

  const hexToRgba = (hex: string, alpha: number): string => {
    const sanitized = hex.replace('#', '');
    const bigint = parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCommit = () => {
    if (field.type === 'number') {
      const num = local.trim() === '' ? null : Number(local);
      onUpdate(Number.isNaN(num as number) ? null : num);
      return;
    }
    if (field.type === 'date') {
      onUpdate(local.trim() === '' ? null : local);
      return;
    }
    if (field.type === 'email') {
      const emailValue = local.trim();
      if (emailValue === '') {
        setEmailError(null);
        onUpdate(null);
        return;
      }
      if (!validateEmail(emailValue)) {
        setEmailError('Please enter a valid email address');
        return;
      }
      setEmailError(null);
      onUpdate(emailValue);
      return;
    }
    onUpdate(local);
  };

  const baseInputClass = "w-full px-2 py-1 text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white rounded transition-all disabled:opacity-60";

  if (field.type === 'single_select') {
    const selectedColor = value == null ? undefined : choiceColors[String(value)];
    return (
      <select
        className={`${baseInputClass} cursor-pointer rounded-sm`}
        value={value == null ? '' : String(value)}
        onChange={(e) => onUpdate(e.target.value || null)}
        disabled={isSaving}
        style={selectedColor ? { backgroundColor: hexToRgba(selectedColor, 0.18) } : undefined}
      >
        <option value="">Select...</option>
        {selectChoices.map((choice) => (
          <option 
            key={choice.key} 
            value={choice.key} 
            style={{ backgroundColor: hexToRgba(choice.color, 0.18) }}
          >
            {choice.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'date') {
    return (
      <input
        type="date"
        className={baseInputClass}
        value={value == null ? '' : String(value)}
        onChange={(e) => onUpdate(e.target.value || null)}
        disabled={isSaving}
      />
    );
  }

  if (field.type === 'email') {
    return (
      <div className="w-full">
        <input
          type="email"
          className={`${baseInputClass} ${emailError ? 'focus:ring-red-500 text-red-600' : ''}`}
          value={local}
          onChange={(e) => {
            setLocal(e.target.value);
            if (emailError) setEmailError(null); // Clear error on typing
          }}
          onBlur={handleCommit}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); }}
          disabled={isSaving}
          placeholder="Enter email address..."
        />
        {emailError && (
          <div className="text-xs text-red-600 mt-1 px-3">{emailError}</div>
        )}
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        className={baseInputClass}
        value={value == null ? '' : String(value)}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); }}
        disabled={isSaving}
        placeholder="0"
      />
    );
  }

  // default: text
  return (
    <input
      type="text"
      className={baseInputClass}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); }}
      disabled={isSaving}
      placeholder="Enter text..."
    />
  );
}


