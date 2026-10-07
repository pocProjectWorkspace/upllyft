'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Badge, Button, Card, useToast } from '@upllyft/ui';
import {
  downloadTherapistTemplate,
  importTherapists,
  type TherapistImportResult,
  type TherapistOutcome,
} from '@/lib/api/onboarding';

const OUTCOME: Record<TherapistOutcome, { label: string; color: 'green' | 'blue' | 'gray' | 'red' }> = {
  'would-create': { label: 'New', color: 'green' },
  created: { label: 'Created', color: 'green' },
  'would-link': { label: 'Add to organisation', color: 'blue' },
  linked: { label: 'Added', color: 'blue' },
  exists: { label: 'Already on Upllyft', color: 'gray' },
  error: { label: 'Fix this row', color: 'red' },
};

const COLUMNS: Array<[string, string]> = [
  ['Name', 'required'],
  ['Email', 'required'],
  ['Phone', ''],
  ['Title', ''],
  ['Department', 'psychology, speech, ot, aba, physio, specialed'],
  ['Specializations', 'separate with ;'],
  ['Languages', 'separate with ;'],
  ['Years Experience', '0–60'],
  ['Country', 'India, UAE or Saudi Arabia'],
  ['City', ''],
  ['Licence Number', ''],
  ['Bio', ''],
];

/** "12 set-password emails go out now" / "… over about 3 days". */
function emailNote(e: TherapistImportResult['emails'], dryRun: boolean): string | null {
  if (!e || e.emails === 0) return null;
  const n = `${e.emails} set-password email${e.emails === 1 ? '' : 's'}`;
  const verb = dryRun ? 'will go out' : 'are going out';
  if (e.days <= 1) return `${n} ${verb} shortly.`;
  return `${n} ${verb} over about ${e.days} days — the email plan sends up to ${e.dailyLimit} a day${
    e.alreadyQueued ? `, and ${e.alreadyQueued} earlier emails are still waiting` : ''
  }.`;
}

/**
 * Download the template, upload it filled in, check the preview, then import. Shared by
 * the platform admin console (`/admin/onboarding`) and organisation admins
 * (`/organizations/<slug>/onboarding`); `apiBase` is the one that differs.
 */
export function TherapistImport({ apiBase, organizationName }: { apiBase: string; organizationName?: string }) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TherapistImportResult | null>(null);

  const template = useMutation({
    mutationFn: (format: 'xlsx' | 'csv') => downloadTherapistTemplate(apiBase, format),
    onError: () => toast({ title: 'Could not download the template', variant: 'destructive' }),
  });

  const run = useMutation({
    mutationFn: ({ f, dryRun }: { f: File; dryRun: boolean }) => importTherapists(apiBase, f, dryRun),
    onSuccess: (data, { dryRun }) => {
      setResult(data);
      if (!dryRun) {
        toast({ title: 'Import finished', description: `${data.created} created, ${data.linked} added, ${data.errors} not imported.` });
      }
    },
    onError: (err: any) => {
      setResult(null);
      toast({
        title: 'Could not read that file',
        description: err?.response?.data?.message ?? 'Use the template (.xlsx or .csv) and try again.',
        variant: 'destructive',
      });
    },
  });

  function choose(f: File | null) {
    setFile(f);
    setResult(null);
    if (f) run.mutate({ f, dryRun: true });
  }

  function reset() {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const toImport = result ? result.created + result.linked : 0;
  const note = result ? emailNote(result.emails, result.dryRun) : null;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">1. Download the template</h2>
        <p className="mt-1 text-sm text-gray-500">
          One row per therapist. Keep the header row; the Excel file has a &ldquo;How to fill&rdquo; sheet with examples.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => template.mutate('xlsx')} disabled={template.isPending}>
            Download Excel template
          </Button>
          <Button variant="outline" onClick={() => template.mutate('csv')} disabled={template.isPending}>
            Download CSV
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {COLUMNS.map(([col, hint]) => (
            <span
              key={col}
              title={hint || undefined}
              className={`rounded-full px-2.5 py-1 text-xs ${
                hint === 'required' ? 'bg-teal-50 font-semibold text-teal-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {col}
              {hint === 'required' ? ' *' : ''}
            </span>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">2. Upload the filled file</h2>
        <p className="mt-1 text-sm text-gray-500">
          We check every row first — nothing is created until you confirm. Up to 500 rows, 2 MB.
        </p>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 px-6 py-8 text-center hover:border-teal-300">
          <span className="text-sm font-medium text-gray-900">{file ? file.name : 'Choose a .xlsx or .csv file'}</span>
          <span className="mt-1 text-xs text-gray-500">{run.isPending ? 'Checking…' : 'Click to browse'}</span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
          />
        </label>
      </Card>

      {result && (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {result.dryRun ? '3. Check and import' : 'Import complete'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {result.total} row{result.total === 1 ? '' : 's'} read
                {organizationName ? ` · therapists join ${organizationName}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge color="green">{result.created} new</Badge>
              {result.linked > 0 && <Badge color="blue">{result.linked} added to organisation</Badge>}
              {result.skipped > 0 && <Badge color="gray">{result.skipped} already on Upllyft</Badge>}
              {result.errors > 0 && <Badge color="red">{result.errors} to fix</Badge>}
            </div>
          </div>

          {note && <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">{note}</p>}
          {result.dryRun && result.errors > 0 && (
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Rows marked &ldquo;Fix this row&rdquo; will be skipped. Fix them in the file and upload it again, or import the rest now.
            </p>
          )}

          <div className="mt-4 max-h-[28rem] overflow-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Therapist</th>
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.rows.map((r) => (
                  <tr key={r.row} className={r.outcome === 'error' ? 'bg-red-50/40' : undefined}>
                    <td className="px-3 py-2 text-gray-500">{r.row}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{r.name || '—'}</div>
                      <div className="text-xs text-gray-500">{r.email || ''}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge color={OUTCOME[r.outcome].color}>{OUTCOME[r.outcome].label}</Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {result.dryRun ? (
              <>
                <Button onClick={() => file && run.mutate({ f: file, dryRun: false })} disabled={!toImport || run.isPending}>
                  {run.isPending ? 'Importing…' : `Import ${toImport} therapist${toImport === 1 ? '' : 's'}`}
                </Button>
                <Button variant="outline" onClick={reset} disabled={run.isPending}>
                  Choose another file
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={reset}>
                Import another file
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
