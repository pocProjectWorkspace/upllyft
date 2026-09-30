/**
 * Money display, one rule for the whole hub (backlog #13, "AED to rupees"):
 *
 *   1. A record that carries a currency (invoice, session pricing, care plan) is
 *      shown in THAT currency.
 *   2. Anything without one (case billing lines, empty summaries) falls back to
 *      the viewer's regional currency — `useRegion().currency` (IN → INR,
 *      AE → AED, SA → SAR; INR when the country is unknown).
 *   3. Amounts in different currencies are never added together.
 *
 * Several screens used to hard-code "AED" (or USD / ₹), so an Indian clinic's
 * rupee invoices were labelled dirhams.
 */

const LOCALE_FOR: Record<string, string> = {
  INR: 'en-IN',
  AED: 'en-AE',
  SAR: 'en-SA',
};

export function formatMoney(
  amount: number | string | null | undefined,
  currency: string,
  opts: { decimals?: boolean } = {},
): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  // A missing amount is unknown, not zero.
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const digits = opts.decimals === false ? 0 : 2;
  try {
    return new Intl.NumberFormat(LOCALE_FOR[currency] ?? 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    // Unknown/invalid ISO code from old data — still show the number and the code.
    return `${currency} ${value.toLocaleString('en-US', { maximumFractionDigits: digits })}`;
  }
}
