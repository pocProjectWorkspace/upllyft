'use client';

/**
 * Backlog #8: a professional a screening is shared with sees the scores and the
 * summary. The item-by-item answers go only if the parent ticks this.
 */
export function ShareAnswersToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 cursor-pointer hover:border-teal-300 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      />
      <span className="text-sm">
        <span className="font-medium text-gray-900">Also share my answers</span>
        <span className="block text-gray-500 mt-0.5">
          They will always see the scores and summary. Tick this to also show how you answered each
          question.
        </span>
      </span>
    </label>
  );
}
