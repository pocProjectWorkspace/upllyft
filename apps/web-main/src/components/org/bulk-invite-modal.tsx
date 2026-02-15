'use client';

import { useState, useRef } from 'react';
import { useToast } from '@upllyft/ui';
import { bulkInviteOrgMembers } from '@/lib/api/organizations';

interface BulkInviteModalProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  email: string;
  role: string;
}

export function BulkInviteModal({
  slug,
  open,
  onOpenChange,
  onSuccess,
}: BulkInviteModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [sending, setSending] = useState(false);

  function parseCSV(text: string): ParsedRow[] {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const rows: ParsedRow[] = [];

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      const email = parts[0];
      if (!email || !email.includes('@')) continue;
      const role = parts[1]?.toLowerCase() === 'admin' ? 'Admin' : 'Member';
      rows.push({ email, role });
    }

    return rows;
  }

  function handleTextChange(text: string) {
    setCsvText(text);
    setParsed(parseCSV(text));
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      handleTextChange(text);
    };
    reader.readAsText(file);
  }

  async function handleSubmit() {
    if (parsed.length === 0) return;

    setSending(true);
    try {
      const result = await bulkInviteOrgMembers(slug, parsed);
      toast({
        title: 'Bulk invite complete',
        description: `${result.invited} invited, ${result.failed} failed`,
      });
      if (result.errors?.length) {
        console.warn('Bulk invite errors:', result.errors);
      }
      setCsvText('');
      setParsed([]);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to send invitations',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Bulk Invite Members</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Upload a CSV file or paste emails below. Format: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">email,role</code> (one per line). Role is optional and defaults to Member.
          </p>

          {/* File upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload CSV
            </button>
          </div>

          {/* Text input */}
          <textarea
            value={csvText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={"user@example.com,Member\nadmin@example.com,Admin"}
            rows={6}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none resize-none font-mono"
          />

          {/* Preview */}
          {parsed.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 mb-2">
                {parsed.length} member{parsed.length !== 1 ? 's' : ''} to invite:
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {parsed.map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate">{row.email}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      row.role === 'Admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {row.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={sending || parsed.length === 0}
              className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : `Invite ${parsed.length} Member${parsed.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
