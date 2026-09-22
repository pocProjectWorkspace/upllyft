'use client';

import {
  Input,
  Label,
  Textarea,
  Checkbox,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@upllyft/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { ClinicalField, ClinicalTableColumn } from '@upllyft/types';

interface DynamicFieldProps {
  field: ClinicalField;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}

/** Renders a single template field as the appropriate input control. */
export function DynamicField({ field, value, onChange, readOnly }: DynamicFieldProps) {
  const disabled = readOnly || field.readOnly;

  if (field.type === 'heading') {
    return (
      <p className="text-sm font-medium text-gray-700 pt-2">{field.label}</p>
    );
  }

  return (
    <div>
      <Label className="text-sm font-medium text-gray-800">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {field.guidance && (
        <p className="text-xs text-gray-400 mt-0.5 mb-1">{field.guidance}</p>
      )}
      <div className={field.guidance ? '' : 'mt-1.5'}>
        <FieldControl field={field} value={value} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ClinicalField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  switch (field.type) {
    case 'longtext':
      return (
        <Textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={4}
          placeholder={field.placeholder}
        />
      );

    case 'select':
      return (
        <Select
          value={(value as string) ?? ''}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || 'Select…'} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'multiselect':
    case 'checklist':
    case 'consent': {
      const opts = field.type === 'consent' ? field.consentScopes ?? [] : field.options ?? [];
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (opt: string) => {
        if (disabled) return;
        onChange(
          selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt],
        );
      };
      return (
        <div className="grid sm:grid-cols-2 gap-2">
          {opts.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={() => toggle(opt)}
                disabled={disabled}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <Checkbox
            checked={!!value}
            onCheckedChange={(c) => onChange(!!c)}
            disabled={disabled}
          />
          <span className="text-gray-500">Confirm</span>
        </label>
      );

    case 'date':
      return (
        <Input
          type="date"
          value={toDateInput(value)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );

    case 'datetime':
      return (
        <Input
          type="datetime-local"
          value={toDateTimeInput(value)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );

    case 'daterange': {
      const v = (value as { from?: string; to?: string }) ?? {};
      return (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={v.from ?? ''}
            onChange={(e) => onChange({ ...v, from: e.target.value })}
            disabled={disabled}
          />
          <span className="text-gray-400 text-sm">to</span>
          <Input
            type="date"
            value={v.to ?? ''}
            onChange={(e) => onChange({ ...v, to: e.target.value })}
            disabled={disabled}
          />
        </div>
      );
    }

    case 'number':
    case 'scale':
      return (
        <Input
          type="number"
          value={(value as number | string) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={disabled}
          placeholder={field.placeholder}
        />
      );

    case 'signature': {
      const v = (value as { name?: string; date?: string }) ?? {};
      return (
        <div className="flex items-center gap-2">
          <Input
            value={v.name ?? ''}
            onChange={(e) => onChange({ ...v, name: e.target.value, date: v.date })}
            disabled={disabled}
            placeholder="Typed signature (name)"
          />
        </div>
      );
    }

    case 'attachment':
      return (
        <Input
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Paste a document link / reference"
        />
      );

    case 'table':
    case 'smartgoal':
      return (
        <RepeatableTable
          columns={field.columns ?? [{ key: 'value', label: 'Value' }]}
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'text':
    default:
      return (
        <Input
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.placeholder}
        />
      );
  }
}

function RepeatableTable({
  columns,
  value,
  onChange,
  disabled,
}: {
  columns: ClinicalTableColumn[];
  value: Record<string, unknown>[];
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const rows = value.length ? value : [];

  const setCell = (rowIdx: number, key: string, cell: unknown) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [key]: cell } : r));
    onChange(next);
  };
  const addRow = () => onChange([...rows, {}]);
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">
                {c.label}
              </th>
            ))}
            {!disabled && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="px-3 py-3 text-gray-400 text-center">
                No rows yet
              </td>
            </tr>
          )}
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-t border-gray-100">
              {columns.map((c) => (
                <td key={c.key} className="px-2 py-1.5 align-top">
                  {c.type === 'select' && c.options ? (
                    <select
                      className="w-full text-sm border border-gray-200 rounded px-2 py-1 bg-white disabled:bg-gray-50"
                      value={(row[c.key] as string) ?? ''}
                      onChange={(e) => setCell(rowIdx, c.key, e.target.value)}
                      disabled={disabled}
                    >
                      <option value="">—</option>
                      {c.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'}
                      className="w-full text-sm border border-gray-200 rounded px-2 py-1 bg-white disabled:bg-gray-50 min-w-[120px]"
                      value={(row[c.key] as string) ?? ''}
                      onChange={(e) => setCell(rowIdx, c.key, e.target.value)}
                      disabled={disabled}
                    />
                  )}
                </td>
              ))}
              {!disabled && (
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(rowIdx)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!disabled && (
        <div className="p-2 border-t border-gray-100">
          <Button type="button" variant="ghost" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" /> Add row
          </Button>
        </div>
      )}
    </div>
  );
}

function toDateInput(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  try {
    return new Date(value as any).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function toDateTimeInput(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string' && value.length >= 16 && value.includes('T')) {
    return value.slice(0, 16);
  }
  try {
    return new Date(value as any).toISOString().slice(0, 16);
  } catch {
    return '';
  }
}
