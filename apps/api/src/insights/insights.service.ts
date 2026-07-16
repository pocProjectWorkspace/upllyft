import { Injectable } from '@nestjs/common';
import { FacilityRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertFacilityMember } from '../common/facility-scope';

interface Actor {
  id: string;
  role: string;
}

export interface GroupStat {
  group: string;
  total: number;
  identified: number;
  rate: number; // identified / total, 0..1
}

/**
 * Setting-level early-identification insights (F10) — the leadership view.
 *
 * Everything here is READ-ONLY aggregation over what the other features already record, and
 * every query is scoped to the one facility. This is the lesson from the clinic-outcomes
 * leak: an aggregate is still PHI, so it must be facility-bound, never a global count.
 *
 * The distinctive part is EQUITY: are some groups of children being identified more (or less)
 * than others? Over- and under-identification are both failures early-years settings rarely
 * get to see. We compute the identification rate across the demographics we actually hold —
 * gender, age band, and home-language group — with the caveat (surfaced in the UI) that these
 * are small samples, indicative not conclusive.
 */
@Injectable()
export class InsightsService {
  private static readonly LEAD_ROLES: FacilityRole[] = ['OWNER', 'ADMIN', 'INCLUSION_LEAD'];

  constructor(private readonly prisma: PrismaService) {}

  async facilityInsights(actor: Actor, facilityId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId, InsightsService.LEAD_ROLES);

    const affiliations = await this.prisma.childAffiliation.findMany({
      where: { facilityId, endedAt: null },
      select: {
        status: true,
        child: {
          select: { id: true, gender: true, dateOfBirth: true, primaryLanguage: true },
        },
      },
    });

    const active = affiliations.filter((a) => a.status === 'ACTIVE');
    const pending = affiliations.filter((a) => a.status === 'PENDING_CONSENT');
    const childIds = active.map((a) => a.child.id);

    // Latest educator screening per child → its flagged domains.
    const screenings = await this.prisma.assessment.findMany({
      where: { childId: { in: childIds }, informantType: 'EDUCATOR', tier1Completed: true },
      orderBy: { createdAt: 'desc' },
      select: { childId: true, flaggedDomains: true },
    });
    const latestFlags = new Map<string, string[]>();
    for (const s of screenings) {
      if (!latestFlags.has(s.childId)) latestFlags.set(s.childId, s.flaggedDomains ?? []);
    }

    // Concerns raised (any status) per child — the other identification signal.
    const concerns = await this.prisma.concern.findMany({
      where: { facilityId, childId: { in: childIds } },
      select: { childId: true, status: true, domains: true },
    });
    const concernChildIds = new Set(concerns.map((c) => c.childId));

    // "Identified" = a flagged screening OR a concern raised.
    const identifiedIds = new Set<string>();
    for (const [cid, flags] of latestFlags) if (flags.length > 0) identifiedIds.add(cid);
    for (const cid of concernChildIds) identifiedIds.add(cid);

    // Flags per domain across the cohort.
    const domainCounts: Record<string, number> = {};
    for (const flags of latestFlags.values()) {
      for (const d of flags) domainCounts[d] = (domainCounts[d] ?? 0) + 1;
    }

    const [concernAgg, planAgg, reviewsDone] = await Promise.all([
      this.groupCount(this.prisma.concern, { facilityId }, 'status'),
      this.groupCount(this.prisma.supportPlan, { facilityId }, 'status'),
      this.prisma.developmentalReview.count({ where: { facilityId, status: { in: ['SHARED', 'ACKNOWLEDGED'] } } }),
    ]);

    const outcomes = await this.prisma.supportOutcome.findMany({
      where: { plan: { facilityId } },
      select: { status: true },
    });

    const now = new Date();
    return {
      headcount: {
        active: active.length,
        pendingConsent: pending.length,
        screened: latestFlags.size,
        identified: identifiedIds.size,
      },
      domainFlags: Object.entries(domainCounts)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count),
      concerns: concernAgg,
      supportPlans: planAgg,
      outcomes: {
        total: outcomes.length,
        achieved: outcomes.filter((o) => o.status === 'ACHIEVED').length,
        inProgress: outcomes.filter((o) => o.status === 'IN_PROGRESS').length,
      },
      reviews: { done: reviewsDone },
      equity: {
        note:
          'Identification rate by group. Small samples — indicative, not conclusive. A group that stands out is a prompt to look, not a verdict.',
        byGender: this.equityBy(active, identifiedIds, (c) => c.gender || 'Not recorded'),
        byAgeBand: this.equityBy(active, identifiedIds, (c) => ageBand(c.dateOfBirth, now)),
        byLanguage: this.equityBy(active, identifiedIds, (c) => languageGroup(c.primaryLanguage)),
      },
    };
  }

  /** Group active children by a key and compute identified/total/rate per group. */
  private equityBy(
    active: { child: { id: string; gender: string; dateOfBirth: Date; primaryLanguage: string | null } }[],
    identifiedIds: Set<string>,
    keyOf: (c: { gender: string; dateOfBirth: Date; primaryLanguage: string | null }) => string,
  ): GroupStat[] {
    const groups = new Map<string, { total: number; identified: number }>();
    for (const a of active) {
      const key = keyOf(a.child);
      const g = groups.get(key) ?? { total: 0, identified: 0 };
      g.total += 1;
      if (identifiedIds.has(a.child.id)) g.identified += 1;
      groups.set(key, g);
    }
    return [...groups.entries()]
      .map(([group, g]) => ({
        group,
        total: g.total,
        identified: g.identified,
        rate: g.total ? g.identified / g.total : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }

  /** groupBy a status-like field into { STATUS: count }. */
  private async groupCount(
    model: { groupBy: (args: any) => Promise<any[]> },
    where: Record<string, unknown>,
    field: string,
  ): Promise<Record<string, number>> {
    const rows = await model.groupBy({ by: [field], where, _count: { _all: true } });
    const out: Record<string, number> = {};
    for (const r of rows) out[r[field]] = r._count._all;
    return out;
  }
}

// ── Grouping helpers ──

function ageBand(dob: Date, now: Date): string {
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (months < 24) return 'Under 2';
  if (months < 36) return '2–3';
  if (months < 48) return '3–4';
  return '4+';
}

function languageGroup(primary: string | null): string {
  if (!primary) return 'Not recorded';
  return /^en(glish)?$/i.test(primary.trim()) ? 'English at home' : 'Additional language at home';
}
