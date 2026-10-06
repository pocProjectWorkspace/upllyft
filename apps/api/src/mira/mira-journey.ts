/**
 * Mira ↔ Resources journey. The extraction model only ever REQUESTS things —
 * `resource_request` (areas + keywords) and `log_request` (a hint at an activity the
 * parent described). Everything shown is resolved here from real data, so Mira cannot
 * name a resource that does not exist, and nothing is logged until the parent taps.
 */
import { isJourneyDomain, JourneyDomain } from '../resource-journey/domains';

export interface ResourceRequest {
  areas: JourneyDomain[];
  query: string;
}

export interface LogRequest {
  resourceHint: string;
  help: 0 | 1 | 2 | null;
  engagement: 0 | 1 | 2 | null;
  date: string | null;
}

const scale = (v: unknown): 0 | 1 | 2 | null => (v === 0 || v === 1 || v === 2 ? v : null);

export function parseResourceRequest(raw: unknown): ResourceRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as any;
  const areas = (Array.isArray(r.areas) ? r.areas : []).filter(isJourneyDomain);
  const query = typeof r.query === 'string' ? r.query.trim().slice(0, 100) : '';
  if (!areas.length && !query) return null;
  return { areas, query };
}

export function parseLogRequest(raw: unknown): LogRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as any;
  const resourceHint = typeof r.resourceHint === 'string' ? r.resourceHint.trim().slice(0, 120) : '';
  if (!resourceHint) return null;
  return {
    resourceHint,
    help: scale(r.help),
    engagement: scale(r.engagement),
    date: typeof r.date === 'string' ? r.date.trim() : null,
  };
}

/** "today" / "yesterday" / YYYY-MM-DD → ISO date (noon UTC); unknown or future → today. */
export function resolveLogDate(value: string | null, today = new Date()): string {
  const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12));
  if (!value || value.toLowerCase() === 'today') return base.toISOString();
  if (value.toLowerCase() === 'yesterday') return new Date(base.getTime() - 864e5).toISOString();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
    if (!Number.isNaN(d.getTime()) && d.getTime() <= base.getTime()) return d.toISOString();
  }
  return base.toISOString();
}

const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'for', 'with', 'my', 'our', 'his', 'her', 'part', 'step', 'by']);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Share of the hint's words found in the title (0–1). */
export function titleScore(hint: string, title: string): number {
  const h = tokens(hint);
  if (!h.length) return 0;
  const t = new Set(tokens(title));
  return h.filter((w) => t.has(w) || [...t].some((x) => x.startsWith(w) || w.startsWith(x))).length / h.length;
}

/**
 * The saved item a parent most likely meant. Confident only when the best match covers
 * at least half the hint and clearly beats the runner-up; otherwise null (the card then
 * asks the parent to pick).
 */
export function matchSavedItem<T extends { title: string }>(hint: string, items: T[]): T | null {
  const scored = items
    .map((item) => ({ item, score: titleScore(hint, item.title) }))
    .sort((a, b) => b.score - a.score);
  const [best, second] = scored;
  if (!best || best.score < 0.5) return null;
  if (second && second.score >= best.score - 0.15) return null;
  return best.item;
}

/** Rank candidate cards for a resource request: area overlap, then keyword hits. */
export function rankForRequest<T extends { title: string; practises: string | null; domains: string[] }>(
  req: ResourceRequest,
  cards: T[],
  max = 3,
): T[] {
  const words = tokens(req.query);
  return cards
    .map((c) => {
      const areaHit = req.areas.length ? c.domains.some((d) => (req.areas as string[]).includes(d)) : true;
      const text = `${c.title} ${c.practises ?? ''}`.toLowerCase();
      const hits = words.filter((w) => text.includes(w)).length;
      return { c, areaHit, hits };
    })
    .filter((x) => x.areaHit && (req.areas.length > 0 || x.hits > 0))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, max)
    .map((x) => x.c);
}
