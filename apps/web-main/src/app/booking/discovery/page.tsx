'use client';

import Image from '@/components/app-image';
import { Suspense, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, useAuth, useRegion, APP_URLS } from '@upllyft/api-client';
import { MiraNudge, Skeleton, useDebounce } from '@upllyft/ui';
import { RegionGate } from '@/booking/components/region-gate';
import { BOOKING_ENABLED, BookingComingSoon } from '@/booking/lib/booking-availability';
import { BookingShell } from '@/booking/components/booking-shell';
import { useSearchTherapists } from '@/booking/hooks/use-marketplace';
import { useSearchClinics } from '@/booking/hooks/use-clinics';
import { useShortlistIds, useToggleShortlist } from '@/booking/hooks/use-shortlist';
import { formatCurrency } from '@/booking/lib/utils';
import { CONCERN_LABELS, DOMAIN_LABELS } from '@/booking/lib/api/find-care';
import type { MatchTier, ProviderMatch } from '@/booking/lib/api/marketplace';

import { CareWaitlistCard } from '@/booking/components/care-waitlist-card';
/**
 * Find care — the one place parents browse providers (merged with the former /booking
 * grid: name/clinic search, city, specialty chips, listed-by and sort live here too).
 *
 * Discovery results — the mockup's combined surface: one list of therapists AND clinics,
 * result tabs (All · Therapists · Clinics), a context bar naming exactly where the
 * ranking comes from, the market-model banner (India books therapists directly; UAE goes
 * clinic-first), practical filters, and provider cards with a tier band, one plain "why"
 * line, and Save / Compare / View / primary actions.
 */

interface Row {
  key: string;
  kind: 'THERAPIST' | 'CLINIC';
  id: string;
  name: string;
  role: string;
  rating: number;
  reviews: number;
  tags: string[];
  price: number | null;
  metaBits: string[];
  match?: ProviderMatch;
  image?: string | null;
  years: number;
}

const TIER_STYLES: Record<
  Exclude<MatchTier, 'none'>,
  { band: string; dot: string; fg: string; label: string }
> = {
  strong: { band: 'bg-teal-50 border-teal-100', dot: 'bg-teal-500', fg: 'text-teal-700', label: 'Strong fit' },
  likely: { band: 'bg-amber-50 border-amber-100', dot: 'bg-amber-500', fg: 'text-amber-700', label: 'Likely a fit' },
  also: { band: 'bg-slate-50 border-slate-100', dot: 'bg-slate-400', fg: 'text-slate-500', label: 'Also relevant' },
};

const AVATAR_COLORS = ['bg-violet-600', 'bg-orange-600', 'bg-teal-600', 'bg-amber-500', 'bg-blue-600', 'bg-pink-600', 'bg-emerald-600'];
function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const TIER_RANK: Record<MatchTier, number> = { strong: 0, likely: 1, also: 2, none: 3 };

/** Values are DepartmentKeys; the API also accepts the old labels Mira deep-links send. */
const SPECIALTIES: Array<{ value: string; label: string; clinic: RegExp }> = [
  { value: 'speech', label: 'Speech Therapy', clinic: /speech|language|slp|aac/i },
  { value: 'ot', label: 'Occupational Therapy', clinic: /occupational|sensory|fine motor/i },
  { value: 'aba', label: 'Behavioral Therapy (ABA)', clinic: /behavio|aba\b|bcba/i },
  { value: 'psychology', label: 'Child Psychology', clinic: /psycholog|counsel/i },
  { value: 'physio', label: 'Physiotherapy', clinic: /physio|physical therap|gross motor/i },
  { value: 'specialed', label: 'Special Education', clinic: /special educat/i },
];

type SortOption = 'relevance' | 'rating' | 'experience';

function DiscoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { region, serviceModel, currency, isRegionResolved } = useRegion();
  const isParent = user?.role === 'USER';

  // Search controls carried over from the former /booking grid. Mira deep-links arrive
  // as ?specialization= / ?search= / ?minRating= / ?therapistId= and are honoured here.
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const search = useDebounce(searchInput.trim(), 400);
  const [cityInput, setCityInput] = useState(searchParams.get('city') ?? '');
  const city = useDebounce(cityInput.trim(), 400);
  const [specialty, setSpecialty] = useState(searchParams.get('specialization') ?? '');
  const [source, setSource] = useState<'' | 'independent' | 'clinic'>('');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  useEffect(() => {
    const therapistId = searchParams.get('therapistId');
    if (therapistId) router.replace(`/booking/therapists/${therapistId}`);
  }, [searchParams, router]);

  // Start from the parent's own city, unless the link named one.
  useEffect(() => {
    if (!searchParams.get('city') && user?.city) setCityInput(user.city);
  }, [user?.city, searchParams]);

  const childId = searchParams.get('childId') || undefined;
  const concern = searchParams.get('concern') || undefined;
  const initialTab = searchParams.get('tab');

  // "From screening" vs "Browse without screening" — the mockup's mode tabs.
  const [mode, setMode] = useState<'fit' | 'browse'>('fit');
  const fitParams = mode === 'fit' ? { childId, concern } : {};

  const [tab, setTab] = useState<'all' | 'therapists' | 'clinics'>(
    initialTab === 'therapists' || initialTab === 'clinics' ? initialTab : 'all',
  );
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number>(Number(searchParams.get('minRating')) || 0);
  const [compareSel, setCompareSel] = useState<string[]>([]);
  const [locOpen, setLocOpen] = useState(false);

  const { data: tData, isLoading: tLoading } = useSearchTherapists({
    ...fitParams,
    country: region?.country,
    search: search || undefined,
    city: city || undefined,
    specialization: specialty || undefined,
    source: source || undefined,
    limit: 50,
  });
  const { data: cData, isLoading: cLoading } = useSearchClinics({
    ...fitParams,
    country: region?.country,
    search: search || undefined,
    city: city || undefined,
    limit: 50,
  });
  const isLoading = tLoading || cLoading;

  const needs = tData?.needs;
  const inFit = mode === 'fit' && !!needs && needs.source !== 'none';
  const fromScreening = inFit && needs!.source === 'screening';
  const fromConcern = inFit && needs!.source === 'self_reported';
  const savedIds = useShortlistIds();
  const toggleSave = useToggleShortlist();

  const isUAE = serviceModel === 'CLINIC_DIRECTORY';
  const locLabel = region?.label ?? (isUAE ? 'UAE' : 'India');
  const locTag = isUAE ? 'UAE' : 'INDIA';
  const locModel = isUAE
    ? 'In the UAE, care runs through licensed clinics. Choose a clinic first, then pick a therapist inside it — clinics appear ahead of individual specialists.'
    : 'In India you book a therapist directly. Individual specialists are shown first; multi-disciplinary clinics appear alongside them.';

  const rows = useMemo<Row[]>(() => {
    const therapists: Row[] = (tData?.therapists ?? []).map((t) => ({
      key: `t-${t.id}`,
      kind: 'THERAPIST',
      id: t.id,
      name: t.user?.name ?? 'Therapist',
      role: `${t.title || 'Therapist'} · ${t.source === 'CLINIC' && t.clinic ? `at ${t.clinic.name}` : 'Independent'}`,
      rating: t.overallRating ?? 0,
      reviews: t.totalRatings ?? 0,
      tags: t.specializations.slice(0, 3),
      price: t.startingPrice && t.startingPrice > 0 ? t.startingPrice : null,
      metaBits: [
        ...(t.location?.city ? [t.location.city] : []),
        ...(t.offersOnline ? ['Online'] : []),
        ...(t.languages.length ? [t.languages.slice(0, 2).join(', ')] : []),
      ],
      match: t.match,
      image: t.profileImage || t.user?.image,
      years: t.yearsExperience ?? 0,
    }));
    const clinics: Row[] = (cData?.clinics ?? []).map((c) => ({
      key: `c-${c.id}`,
      kind: 'CLINIC',
      id: c.id,
      name: c.name,
      role: `Multi-disciplinary clinic · ${c._count.therapists} therapist${c._count.therapists === 1 ? '' : 's'}`,
      rating: c.rating ?? 0,
      reviews: c.totalReviews ?? 0,
      tags: c.specializations.slice(0, 3),
      price: null,
      metaBits: [],
      match: c.match,
      image: c.logoUrl,
      years: 0,
    }));
    // Clinics have no department; match the chip against what they list.
    const chip = SPECIALTIES.find((x) => x.value === specialty);
    const clinicRows = source === 'independent' ? [] : chip ? clinics.filter((c) => c.tags.some((t) => chip.clinic.test(t))) : clinics;

    let all =
      tab === 'therapists' ? therapists : tab === 'clinics' ? clinicRows : [...therapists, ...clinicRows];

    if (maxPrice) all = all.filter((r) => r.price == null || r.price <= maxPrice);
    if (minRating) all = all.filter((r) => r.rating >= minRating);

    // Fit mode: tier first, then rating. Browse: the market model decides who leads —
    // UAE clinics ahead of individuals, India the reverse — then rating.
    all.sort((a, b) => {
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === 'experience') return b.years - a.years || (b.rating ?? 0) - (a.rating ?? 0);
      if (inFit) {
        const d = TIER_RANK[a.match?.tier ?? 'none'] - TIER_RANK[b.match?.tier ?? 'none'];
        if (d !== 0) return d;
      } else if (tab === 'all' && a.kind !== b.kind) {
        const lead = isUAE ? 'CLINIC' : 'THERAPIST';
        return a.kind === lead ? -1 : 1;
      }
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
    return all;
  }, [tData, cData, tab, maxPrice, minRating, inFit, isUAE, specialty, source, sortBy]);

  const strongCount = rows.filter((r) => r.match?.tier === 'strong').length;

  const toggleCompare = useCallback(
    (row: Row) => {
      setCompareSel((sel) => {
        if (sel.includes(row.key)) return sel.filter((k) => k !== row.key);
        if (sel.length >= 3) return sel;
        // Compare is reached from the shortlist, so comparing implies saving.
        if (!savedIds.has(row.id)) {
          toggleSave.mutate(row.kind === 'THERAPIST' ? { therapistId: row.id } : { clinicId: row.id });
        }
        return [...sel, row.key];
      });
    },
    [savedIds, toggleSave],
  );

  function goCompare() {
    const ids = compareSel
      .map((k) => rows.find((r) => r.key === k)?.id)
      .filter(Boolean)
      .join(',');
    router.push(`/booking/saved?compare=${ids}`);
  }

  async function changeRegion(next: 'IN' | 'AE') {
    await apiClient.patch('/users/me/region', { preferredRegion: next });
    setLocOpen(false);
    // Region flows from the auth'd user object — refetch everything that hangs off it.
    queryClient.invalidateQueries();
    window.location.reload();
  }

  const contextLine = fromScreening ? (
    <>
      Matching for <strong className="text-gray-900">{needs!.flaggedDomains.length ? '' : ''}your child</strong> —{' '}
      {needs!.flaggedDomains.map((d) => DOMAIN_LABELS[d] ?? d).join(', ')}
    </>
  ) : fromConcern ? (
    <>
      Based on what you told us — <strong className="text-gray-900">{CONCERN_LABELS[needs!.concern ?? ''] ?? 'your concern'}</strong> · no screening yet
    </>
  ) : (
    <>
      Browsing all {isUAE ? 'clinics & specialists' : 'therapists & clinics'} · <strong className="text-gray-900">{locLabel}</strong>
    </>
  );

  if (isParent && !isRegionResolved) return <RegionGate />;

  const filtersActive = !!(search || specialty || source || maxPrice || minRating);
  const clearAll = () => {
    setSearchInput('');
    setSpecialty('');
    setSource('');
    setMaxPrice(null);
    setMinRating(0);
    setSortBy('relevance');
  };

  return (
    <div className="max-w-7xl mx-auto pb-16">
      {/* ── Mode tabs ───────────────────────────────────────── */}
      {(childId || concern) && (
        <div className="inline-flex gap-1 bg-slate-100 border border-slate-200 rounded-[11px] p-1 mb-3.5">
          {([
            ['fit', needs?.source === 'self_reported' ? 'From what you told us' : 'From screening'],
            ['browse', 'Browse without screening'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`px-4 py-2 rounded-lg text-[12.5px] font-bold whitespace-nowrap transition-colors ${
                mode === id ? 'bg-white text-gray-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Context bar ─────────────────────────────────────── */}
      <div className="flex items-center gap-3.5 bg-white border border-gray-200 rounded-[14px] px-4.5 py-3.5 px-5 mb-[18px] flex-wrap">
        <div
          className={`w-9 h-9 rounded-[11px] grid place-items-center text-[15px] font-extrabold ${
            inFit ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {inFit ? '✓' : '⌕'}
        </div>
        <div className="text-[13.5px] text-slate-700 leading-normal">{contextLine}</div>
        <div className="flex-1" />
        <div className="relative">
          <button onClick={() => setLocOpen((v) => !v)} className="flex items-center gap-1.5">
            <span className="w-[7px] h-[7px] rounded-full bg-teal-500" />
            <span className="text-[12.5px] text-slate-600 font-semibold">{locLabel}</span>
            <span className="text-xs text-teal-600 font-bold">Change</span>
          </button>
          {locOpen && (
            <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-30">
              {([['IN', 'India'], ['AE', 'UAE']] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => changeRegion(id)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-teal-50 ${
                    region?.country === id ? 'font-bold text-teal-700' : 'text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Market model banner ─────────────────────────────── */}
      <div className="flex gap-3 items-center bg-teal-50/60 border border-teal-100 rounded-xl px-4 py-3 mb-[18px]">
        <span className="text-[11px] font-extrabold tracking-[0.06em] text-teal-600 bg-white border border-teal-100 px-2 py-1 rounded-md whitespace-nowrap">
          {locTag}
        </span>
        <span className="text-[13px] text-teal-900 leading-normal">{locModel}</span>
      </div>

      {/* ── Search (from the former /booking grid) ───────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, specialization, clinic…"
          aria-label="Search providers"
          className="flex-1 h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        />
        <input
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          placeholder="City"
          aria-label="City"
          className="sm:w-52 h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        />
      </div>
      {city && (
        <p className="text-xs text-slate-500 mb-3">Showing providers in {city}, plus therapists who offer online sessions.</p>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-[18px]">
        {[{ value: '', label: 'All specialties' }, ...SPECIALTIES].map((x) => (
          <button
            key={x.value}
            onClick={() => setSpecialty(x.value)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors ${
              specialty === x.value || (x.value && SPECIALTIES.find((y) => y.value === specialty)?.label === x.label)
                ? 'bg-teal-600 border-teal-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-teal-400'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {isParent && (
        <div className="mb-[18px]">
          <MiraNudge
            nudgeId="booking-discovery"
            message="Not sure what type of therapist your child needs?"
            chipText="Help me find the right therapist for my child"
            mainAppUrl={APP_URLS.main}
          />
        </div>
      )}

      {/* ── Browse-mode screening nudge ─────────────────────── */}
      {!inFit && isParent && (
        <div className="flex gap-3.5 items-center bg-violet-50 border border-violet-200 rounded-xl px-4.5 py-3.5 px-5 mb-[18px] flex-wrap">
          <div className="flex-1 min-w-[240px] text-[13.5px] text-violet-900 leading-normal">
            Want to know who actually fits your child?{' '}
            <strong>Take the free 5-minute screening</strong> and we&apos;ll match providers to
            their flagged needs.
          </div>
          <a
            href={APP_URLS.screening}
            className="bg-violet-700 hover:bg-violet-800 text-white px-4 py-2.5 rounded-[10px] text-[13px] font-bold whitespace-nowrap transition-colors"
          >
            Start screening
          </a>
        </div>
      )}

      <div className="grid lg:grid-cols-[272px_1fr] gap-[22px] items-start">
        {/* ── Practical filters (real filters only) ─────────── */}
        <div className="lg:sticky lg:top-6 bg-white border border-gray-200 rounded-[14px] p-[18px]">
          <div className="text-[13px] font-extrabold text-gray-900 mb-3">Practical filters</div>

          <div className="text-[11px] font-bold text-slate-400 tracking-[0.06em] mb-2">SESSION COST</div>
          <div className="flex gap-1.5 flex-wrap mb-4">
            {[null, 1000, 1500, 2000].map((p) => (
              <button
                key={String(p)}
                onClick={() => setMaxPrice(p)}
                className={`text-xs px-2.5 py-1.5 rounded-full font-semibold transition-colors ${
                  maxPrice === p
                    ? 'bg-teal-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-400'
                }`}
              >
                {p === null ? 'Any' : `≤ ${formatCurrency(p, currency)}`}
              </button>
            ))}
          </div>

          <div className="h-px bg-slate-100 my-4" />

          <div className="text-[11px] font-bold text-slate-400 tracking-[0.06em] mb-2">LISTED</div>
          <div className="flex gap-1.5 flex-wrap mb-4">
            {([['', 'All'], ['independent', 'Independent'], ['clinic', 'At a clinic']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setSource(v)}
                className={`text-xs px-2.5 py-1.5 rounded-full font-semibold transition-colors ${
                  source === v ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-px bg-slate-100 my-4" />

          <div className="text-[11px] font-bold text-slate-400 tracking-[0.06em] mb-2">MINIMUM RATING</div>
          <div className="flex gap-1.5 flex-wrap">
            {[0, 4, 4.5].map((r) => (
              <button
                key={r}
                onClick={() => setMinRating(r)}
                className={`text-xs px-2.5 py-1.5 rounded-full font-semibold transition-colors ${
                  minRating === r
                    ? 'bg-teal-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-400'
                }`}
              >
                {r === 0 ? 'Any' : `★ ${r}+`}
              </button>
            ))}
          </div>
        </div>

        {/* ── Results column ───────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3.5 flex-wrap">
            {([
              ['all', 'All'],
              ['therapists', 'Therapists'],
              ['clinics', 'Clinics'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-2 rounded-full text-[13.5px] font-semibold border transition-colors ${
                  tab === id
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-teal-400'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="flex-1" />
            <label className="flex items-center gap-2 text-[13px] text-slate-500">
              Sort by
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-[13px] font-semibold text-gray-900 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                <option value="relevance">{fromScreening ? 'Best fit' : fromConcern ? 'Likely fit' : 'Relevance'}</option>
                <option value="rating">Highest rated</option>
                <option value="experience">Most experienced</option>
              </select>
            </label>
          </div>

          {/* Result-count bar */}
          <div className="flex items-center justify-between gap-3 bg-teal-50/60 border border-teal-100 rounded-xl px-4 py-3 mb-4 flex-wrap">
            <div className="text-[13px] text-teal-900">
              {fromScreening ? (
                <>
                  <strong>{rows.length}</strong> providers fit your child&apos;s profile ·{' '}
                  <span className="text-teal-600 font-semibold">{strongCount} strong fits</span>
                </>
              ) : fromConcern ? (
                <>
                  <strong>{rows.length}</strong> providers who often help with{' '}
                  {(CONCERN_LABELS[needs!.concern ?? ''] ?? 'this').toLowerCase()}
                </>
              ) : (
                <>
                  <strong>{rows.length}</strong> therapists &amp; clinics in {locLabel}
                </>
              )}
            </div>
            {compareSel.length > 0 && (
              <button
                onClick={goCompare}
                className="bg-white border border-teal-200 text-teal-700 px-3.5 py-2 rounded-[9px] text-[12.5px] font-bold"
              >
                Compare selected ({compareSel.length})
              </button>
            )}
          </div>

          {/* Cards */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-2xl" />
              ))}
            </div>
          ) : rows.length === 0 && !filtersActive ? (
            // Nothing at all for this need (not just filtered out): offer the waitlist.
            <CareWaitlistCard
              country={region?.country}
              countryLabel={region?.label}
              childId={childId}
              concern={concern}
              domains={needs?.flaggedDomains}
            />
          ) : rows.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-700 font-medium">Nothing matches these filters</p>
              <p className="text-sm text-gray-500 mt-1">Try another search or specialty, or clear the filters.</p>
              <button
                onClick={clearAll}
                className="mt-4 text-sm font-bold text-teal-700"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {rows.map((r) => {
                const tier = inFit && r.match && r.match.tier !== 'none' ? TIER_STYLES[r.match.tier] : null;
                const saved = savedIds.has(r.id);
                const comparing = compareSel.includes(r.key);
                return (
                  <ResultCard
                    key={r.key}
                    r={r}
                    tier={tier}
                    saved={saved}
                    comparing={comparing}
                    isParent={isParent}
                    inFit={inFit}
                    currency={currency}
                    toggleSave={toggleSave}
                    toggleCompare={toggleCompare}
                    router={router}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ResultCardProps = {
  r: Row;
  tier: (typeof TIER_STYLES)[keyof typeof TIER_STYLES] | null;
  saved: boolean;
  comparing: boolean;
  isParent: boolean;
  inFit: boolean;
  currency: Parameters<typeof formatCurrency>[1];
  toggleSave: ReturnType<typeof useToggleShortlist>;
  toggleCompare: (row: Row) => void;
  router: ReturnType<typeof useRouter>;
};

/** One discovery result. Memoised so filter/compare state changes re-render only the cards whose props changed. */
const ResultCard = memo(function ResultCard({
  r,
  tier,
  saved,
  comparing,
  isParent,
  inFit,
  currency,
  toggleSave,
  toggleCompare,
  router,
}: ResultCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col hover:shadow-[0_8px_24px_rgba(15,23,42,0.07)] transition-shadow">
      {/* Tier band */}
      {tier ? (
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${tier.band}`}>
          <div className="flex items-center gap-2">
            <span className={`w-[7px] h-[7px] rounded-full ${tier.dot}`} />
            <span className={`text-xs font-extrabold ${tier.fg}`}>{tier.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11.5px] font-bold opacity-75 ${tier.fg}`}>{r.kind}</span>
            <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-md bg-white text-teal-700 border border-teal-100">
              ON UPLLYFT
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-slate-50 border-slate-100">
          <span className="text-[11.5px] font-bold text-slate-500">{r.kind}</span>
          <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-md bg-white text-teal-700 border border-teal-100">
            ON UPLLYFT
          </span>
        </div>
      )}

      {/* Identity row */}
      <div className="p-4 flex gap-3">
        {r.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <Image src={r.image} alt="" className="w-[52px] h-[52px] rounded-2xl object-cover flex-none" width={52} height={52} />
        ) : (
          <div className={`w-[52px] h-[52px] rounded-2xl text-white grid place-items-center text-base font-extrabold flex-none ${avatarColor(r.name)}`}>
            {initials(r.name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-gray-900 truncate">{r.name}</span>
            <span className="text-[11px] text-blue-600 font-extrabold flex-none">✓</span>
          </div>
          <div className="text-[13px] text-slate-500 truncate">{r.role}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[12.5px] text-amber-500 tracking-widest">
              {'★'.repeat(Math.round(r.rating || 0)).padEnd(5, '☆')}
            </span>
            <span className="text-[12.5px] font-bold text-gray-900">{r.rating.toFixed(1)}</span>
            <span className="text-[12.5px] text-slate-400">({r.reviews})</span>
          </div>
        </div>
        {isParent && (
          <button
            onClick={() => toggleSave.mutate(r.kind === 'THERAPIST' ? { therapistId: r.id } : { clinicId: r.id })}
            aria-label={saved ? 'Remove from saved' : 'Save'}
            className={`w-8 h-8 rounded-[9px] border border-gray-200 bg-white text-sm flex-none leading-none transition-colors ${
              saved ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400'
            }`}
          >
            ♥
          </button>
        )}
      </div>

      {/* Why line */}
      {inFit && r.match?.reason && (
        <div className="px-4 flex items-start gap-2">
          <span className="w-4 h-4 rounded-full flex-none mt-[1px] bg-teal-100 text-teal-700 text-[9px] font-black grid place-items-center leading-none">
            ✓
          </span>
          <span className="text-[12.5px] text-slate-700 leading-snug">{r.match.reason}</span>
        </div>
      )}

      {/* Tags */}
      {r.tags.length > 0 && (
        <div className="px-4 pt-3 flex gap-1.5 flex-wrap">
          {r.tags.map((t) => (
            <span key={t} className="text-[11.5px] font-semibold px-2 py-1 rounded-md bg-blue-50 text-blue-600">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-4 mt-auto">
        <div className="flex items-center gap-3 text-[12.5px] text-slate-500 py-3 border-t border-slate-100 mt-3 flex-wrap">
          {r.price != null && (
            <span>
              <strong className="text-gray-900">{formatCurrency(r.price, currency)}</strong> / session
            </span>
          )}
          {r.metaBits.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <div className="flex gap-2">
          {isParent && (
            <button
              onClick={() => toggleCompare(r)}
              aria-label="Compare"
              className={`w-10 rounded-[10px] border text-[15px] font-bold leading-none transition-colors ${
                comparing
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'bg-white border-gray-200 text-slate-500 hover:border-teal-400'
              }`}
            >
              ⇄
            </button>
          )}
          <button
            onClick={() => router.push(r.kind === 'THERAPIST' ? `/booking/therapists/${r.id}` : `/booking/clinics/${r.id}`)}
            className="flex-1 border border-gray-200 bg-white text-gray-900 py-2.5 rounded-[10px] text-[13.5px] font-semibold hover:border-teal-400 transition-colors"
          >
            View profile
          </button>
          {r.kind === 'THERAPIST' && !BOOKING_ENABLED ? (
            <BookingComingSoon compact className="flex-1" />
          ) : (
            <button
              onClick={() => router.push(r.kind === 'THERAPIST' ? `/booking/book/${r.id}` : `/booking/clinics/${r.id}`)}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-[10px] text-[13.5px] font-bold transition-colors"
            >
              {r.kind === 'THERAPIST' ? 'Book session' : 'See the team'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default function DiscoveryPage() {
  return (
    <BookingShell>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <DiscoveryContent />
      </Suspense>
    </BookingShell>
  );
}
