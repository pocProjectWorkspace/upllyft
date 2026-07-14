import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveScreeningIdentity, type ScreeningActor } from './screening-access';
import type { DomainStatus } from './scoring.service';

/**
 * Multi-informant concordance — what a parent and a nursery each see, side by side.
 *
 * THIS IS THE POINT OF THE WHOLE FEATURE. A child's difficulty is rarely uniform across
 * settings, and the DISAGREEMENT between two informants is often more informative than
 * either report alone:
 *
 *   BOTH CONCERNED     the strongest signal available without a clinician. A difficulty
 *                      that shows up at home AND in a group of twenty is unlikely to be
 *                      situational, a phase, or an anxious parent.
 *
 *   EDUCATOR ONLY      difficulty that only appears under group demands — sitting in a
 *                      circle, sharing, waiting a turn, following an instruction given to
 *                      everyone rather than to them. Parents frequently cannot see this,
 *                      because it does not exist at home. Historically these children are
 *                      caught late, because the person who noticed had no route to say so.
 *
 *   PARENT ONLY        the child who holds it together all day and falls apart at the
 *                      school gate. The nursery reports a child who is "fine"; the parent
 *                      is describing meltdowns, sleep, sensory distress. This pattern is
 *                      routinely mistaken for a parenting problem, and dismissing it is
 *                      one of the most common ways an autistic girl is missed.
 *
 * WHAT WE REFUSE TO SAY. A domain is only comparable when BOTH informants actually
 * observed enough of it (see the INSUFFICIENT_DATA rule in scoring.service.ts). If a
 * keyworker could not see a domain, that is NOT agreement, NOT disagreement, and above
 * all NOT reassurance — it is silence, and it is reported as silence. Treating an
 * unobserved domain as "the nursery isn't worried" would invent consensus out of a blind
 * spot, which is precisely the failure this feature exists to prevent.
 */

export type Concordance =
  | 'AGREE_CONCERN'
  | 'AGREE_TYPICAL'
  | 'EDUCATOR_ONLY'
  | 'PARENT_ONLY'
  | 'NOT_COMPARABLE';

export interface DomainConcordance {
  domainId: string;
  domainName: string;
  concordance: Concordance;
  parent: { riskIndex: number; status: DomainStatus } | null;
  educator: { riskIndex: number; status: DomainStatus } | null;
  /** Absolute gap between the two risk indices. Null when not comparable. */
  delta: number | null;
  /** Why a clinician should care about THIS pattern in THIS domain. */
  interpretation: string;
}

/** A domain is "flagged" when the informant is not saying "on track". */
const isFlagged = (status: DomainStatus) => status === 'YELLOW' || status === 'RED';

/**
 * Two reports more than this far apart are not describing the same child. A parent
 * screening from ten months ago and a keyworker screening from today would produce
 * "disagreement" that is really just development.
 */
const MAX_GAP_DAYS = 120;

@Injectable()
export class ConcordanceService {
  private readonly logger = new Logger(ConcordanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConcordance(childId: string, actor: ScreeningActor) {
    // Authorisation is the same question as "may you screen this child?" — guardian, or
    // staff at a setting the child attends with a live ASSESSMENT consent. Throws
    // otherwise. A nursery cannot read a parent's screening of a child it has no
    // relationship with, and revocation closes this too.
    await resolveScreeningIdentity(this.prisma, childId, actor);

    // TIER 1 IS ENOUGH, and requiring COMPLETED was a bug.
    //
    // A screening that flags a domain moves to TIER2_REQUIRED, not COMPLETED — tier 2 is
    // the follow-up probe into whatever was flagged. So filtering on COMPLETED meant that
    // the children who flagged a concern, who are precisely the children this comparison
    // exists for, would never get one; while a child everyone agreed was fine would.
    // Exactly backwards.
    //
    // Both informants answer the same tier-1 items, and tier-1 domain scores are what we
    // compare. So: anything with tier 1 done and scores on it.
    const completed = await this.prisma.assessment.findMany({
      where: {
        childId,
        tier1Completed: true,
        domainScores: { not: Prisma.DbNull },
      },
      select: {
        id: true,
        informantType: true,
        ageGroup: true,
        completedAt: true,
        tier1CompletedAt: true,
        createdAt: true,
        domainScores: true,
        facility: { select: { id: true, name: true } },
        respondent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const parent = completed.find((a) => a.informantType === 'PARENT') ?? null;
    const educator = completed.find((a) => a.informantType === 'EDUCATOR') ?? null;

    if (!parent || !educator) {
      return {
        available: false,
        reason: !parent
          ? 'No completed parent screening yet.'
          : 'No completed nursery screening yet.',
        haveParent: !!parent,
        haveEducator: !!educator,
        domains: [],
      };
    }

    // Different age bands ask different questions, so the domain scores are not
    // commensurable. Say so rather than comparing them anyway.
    if (parent.ageGroup !== educator.ageGroup) {
      return {
        available: false,
        reason:
          `These screenings used different age bands (${parent.ageGroup} vs ${educator.ageGroup}), ` +
          'so they ask different questions and cannot be compared directly.',
        haveParent: true,
        haveEducator: true,
        domains: [],
      };
    }

    // completedAt is null while a screening sits at TIER2_REQUIRED, so date the report
    // from when tier 1 was actually answered — that is when the informant made their
    // observations, which is what the 120-day comparability window is about.
    const pDate = parent.completedAt ?? parent.tier1CompletedAt ?? parent.createdAt;
    const eDate = educator.completedAt ?? educator.tier1CompletedAt ?? educator.createdAt;
    const gapDays = Math.abs(pDate.getTime() - eDate.getTime()) / 86_400_000;

    if (gapDays > MAX_GAP_DAYS) {
      return {
        available: false,
        reason:
          `These screenings are ${Math.round(gapDays)} days apart. Over that long a child ` +
          'develops, so a difference between them may be time rather than setting.',
        haveParent: true,
        haveEducator: true,
        domains: [],
      };
    }

    const pScores = (parent.domainScores ?? {}) as Record<string, any>;
    const eScores = (educator.domainScores ?? {}) as Record<string, any>;

    const domainIds = [...new Set([...Object.keys(pScores), ...Object.keys(eScores)])].sort();

    const domains: DomainConcordance[] = domainIds.map((domainId) => {
      const p = pScores[domainId];
      const e = eScores[domainId];

      const pStatus: DomainStatus | undefined = p?.status;
      const eStatus: DomainStatus | undefined = e?.status;

      const comparable =
        pStatus &&
        eStatus &&
        pStatus !== 'INSUFFICIENT_DATA' &&
        eStatus !== 'INSUFFICIENT_DATA';

      const domainName = p?.domainName ?? e?.domainName ?? this.prettify(domainId);

      if (!comparable) {
        return {
          domainId,
          domainName,
          concordance: 'NOT_COMPARABLE',
          parent: p ? { riskIndex: p.riskIndex, status: pStatus! } : null,
          educator: e ? { riskIndex: e.riskIndex, status: eStatus! } : null,
          delta: null,
          interpretation: this.notComparableReason(pStatus, eStatus, domainName),
        };
      }

      const pFlag = isFlagged(pStatus!);
      const eFlag = isFlagged(eStatus!);

      let concordance: Concordance;
      if (pFlag && eFlag) concordance = 'AGREE_CONCERN';
      else if (!pFlag && !eFlag) concordance = 'AGREE_TYPICAL';
      else if (eFlag) concordance = 'EDUCATOR_ONLY';
      else concordance = 'PARENT_ONLY';

      return {
        domainId,
        domainName,
        concordance,
        parent: { riskIndex: p.riskIndex, status: pStatus! },
        educator: { riskIndex: e.riskIndex, status: eStatus! },
        delta: Math.round(Math.abs(p.riskIndex - e.riskIndex) * 100) / 100,
        interpretation: this.interpret(concordance, domainName),
      };
    });

    const agreeConcern = domains.filter((d) => d.concordance === 'AGREE_CONCERN');
    const educatorOnly = domains.filter((d) => d.concordance === 'EDUCATOR_ONLY');
    const parentOnly = domains.filter((d) => d.concordance === 'PARENT_ONLY');
    const notComparable = domains.filter((d) => d.concordance === 'NOT_COMPARABLE');

    return {
      available: true,
      parentScreening: {
        id: parent.id,
        completedAt: pDate,
        respondent: parent.respondent?.name ?? null,
      },
      educatorScreening: {
        id: educator.id,
        completedAt: eDate,
        facility: educator.facility?.name ?? null,
        respondent: educator.respondent?.name ?? null,
      },
      ageGroup: parent.ageGroup,
      gapDays: Math.round(gapDays),
      domains,
      summary: {
        agreedConcern: agreeConcern.map((d) => d.domainName),
        educatorOnly: educatorOnly.map((d) => d.domainName),
        parentOnly: parentOnly.map((d) => d.domainName),
        notComparable: notComparable.map((d) => d.domainName),
        headline: this.headline(agreeConcern.length, educatorOnly.length, parentOnly.length),
      },
    };
  }

  private interpret(c: Concordance, domain: string): string {
    switch (c) {
      case 'AGREE_CONCERN':
        return `Both home and nursery see difficulty with ${domain.toLowerCase()}. A pattern that shows up in both settings is the strongest signal available before a clinical assessment — it is unlikely to be situational.`;
      case 'AGREE_TYPICAL':
        return `Home and nursery both see ${domain.toLowerCase()} developing as expected.`;
      case 'EDUCATOR_ONLY':
        return `The nursery sees difficulty with ${domain.toLowerCase()} that home does not. This often means the demands of a group — waiting, sharing, following instructions meant for everyone — surface something that simply does not arise at home. It is worth a conversation, not a dismissal.`;
      case 'PARENT_ONLY':
        return `Home sees difficulty with ${domain.toLowerCase()} that the nursery does not. Some children hold themselves together all day and release it at home; a settled child at nursery does not mean the parent is mistaken. Take both reports seriously.`;
      case 'NOT_COMPARABLE':
        return '';
    }
  }

  private notComparableReason(
    p: DomainStatus | undefined,
    e: DomainStatus | undefined,
    domain: string,
  ): string {
    if (!p) return `No parent report for ${domain.toLowerCase()}.`;
    if (!e) return `No nursery report for ${domain.toLowerCase()}.`;
    if (e === 'INSUFFICIENT_DATA' && p === 'INSUFFICIENT_DATA')
      return `Neither could observe enough of ${domain.toLowerCase()} to say.`;
    if (e === 'INSUFFICIENT_DATA')
      return `The nursery could not observe enough of ${domain.toLowerCase()} to say. This is not the same as them having no concerns.`;
    return `Home could not observe enough of ${domain.toLowerCase()} to say.`;
  }

  private headline(agree: number, eduOnly: number, parentOnly: number): string {
    if (agree > 0) {
      return `${agree} area${agree === 1 ? '' : 's'} where home and nursery agree there is difficulty. This is the clearest indication that a referral conversation is warranted.`;
    }
    if (eduOnly > 0 && parentOnly > 0) {
      return 'Home and nursery each see different difficulties. Both are probably right — children behave differently in different settings.';
    }
    if (eduOnly > 0) {
      return `The nursery sees ${eduOnly} area${eduOnly === 1 ? '' : 's'} of difficulty that home does not. Group settings surface things home cannot see.`;
    }
    if (parentOnly > 0) {
      return `Home sees ${parentOnly} area${parentOnly === 1 ? '' : 's'} of difficulty the nursery does not. A child who copes at nursery may be spending everything they have to do so.`;
    }
    return 'Home and nursery both see development on track across the areas they could compare.';
  }

  private prettify(domainId: string): string {
    return domainId
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }
}
