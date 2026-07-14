import { ScoringService } from '../src/assessments/scoring.service';
import { AnswerType } from '../src/assessments/dto/submit-tier1.dto';

/**
 * Scoring integrity — the invariant that decides whether multi-informant screening
 * measures the CHILD or merely measures who was in a position to see them.
 *
 * NOT_SURE scores 0.7, worse than SOMETIMES (0.4). That is fine for a parent, who
 * observes their child in every context. It is fatal for a keyworker, who structurally
 * cannot see bedtime, bathing, or family play: their unavoidable blind spots would score
 * as near-concern, every educator report would run hot, and the parent-vs-educator
 * disagreement that early identification depends on would be an ARTEFACT of observation
 * opportunity rather than a signal about the child.
 *
 * NOT_OBSERVED therefore has to be excluded from the numerator AND the denominator, and
 * must never raise a red flag. These tests are what stop someone "simplifying" that away.
 */
describe('ScoringService — multi-informant integrity', () => {
  const s = new ScoringService();

  const Q = (id: string, redFlag = false) => ({ id, weight: 1.0, redFlag, construct: '', question: id });
  const questions = [Q('q1'), Q('q2'), Q('q3'), Q('q4'), Q('q5', true)];
  const R = (questionId: string, answer: AnswerType) => ({ questionId, answer });
  const score = (rs: any[]) => s.calculateDomainScore(rs, questions as any, 'grossMotor');

  describe('REGRESSION: existing parent screenings must score exactly as before', () => {
    it('all YES -> 0.00 GREEN', () => {
      const d = score(questions.map(q => R(q.id, AnswerType.YES)));
      expect(d.riskIndex).toBe(0);
      expect(d.status).toBe('GREEN');
    });

    it('all NO -> 1.00 RED', () => {
      const d = score(questions.map(q => R(q.id, AnswerType.NO)));
      expect(d.riskIndex).toBe(1);
      expect(d.status).toBe('RED');
    });

    it('mixed answers produce the same arithmetic as before the change', () => {
      // 3 YES (0.0) + 2 SOMETIMES (0.4) = 0.8 / 5 = 0.16
      const d = score([
        R('q1', AnswerType.YES), R('q2', AnswerType.YES), R('q3', AnswerType.YES),
        R('q4', AnswerType.SOMETIMES), R('q5', AnswerType.SOMETIMES),
      ]);
      expect(d.riskIndex).toBe(0.16);
      expect(d.status).toBe('GREEN');
      expect(d.coverage).toBe(1);
    });
  });

  describe('NOT_OBSERVED is excluded from numerator AND denominator', () => {
    it('scores over observed items only, and reports coverage', () => {
      const d = score([
        R('q1', AnswerType.YES), R('q2', AnswerType.YES), R('q3', AnswerType.YES),
        R('q4', AnswerType.NOT_OBSERVED), R('q5', AnswerType.NOT_OBSERVED),
      ]);
      expect(d.observedCount).toBe(3);
      expect(d.coverage).toBe(0.6);
      expect(d.riskIndex).toBe(0);
    });

    it('does NOT score like NOT_SURE — this is the entire point', () => {
      const notObserved = score([
        R('q1', AnswerType.YES), R('q2', AnswerType.YES), R('q3', AnswerType.YES),
        R('q4', AnswerType.NOT_OBSERVED), R('q5', AnswerType.NOT_OBSERVED),
      ]);
      const notSure = score([
        R('q1', AnswerType.YES), R('q2', AnswerType.YES), R('q3', AnswerType.YES),
        R('q4', AnswerType.NOT_SURE), R('q5', AnswerType.NOT_SURE),
      ]);
      expect(notObserved.riskIndex).toBe(0);
      expect(notSure.riskIndex).toBe(0.28);
    });
  });

  describe('silence must never read as reassurance', () => {
    it('nothing observed -> INSUFFICIENT_DATA, not GREEN', () => {
      // The original bug: `riskIndex = totalWeight > 0 ? ... : 0` meant a domain with
      // nothing answered scored 0 — which is GREEN, "your child is developing well".
      const d = score(questions.map(q => R(q.id, AnswerType.NOT_OBSERVED)));
      expect(d.status).toBe('INSUFFICIENT_DATA');
      expect(d.status).not.toBe('GREEN');
      expect(d.coverage).toBe(0);
    });

    it('one item observed is not a verdict', () => {
      const d = score([
        R('q1', AnswerType.YES), R('q2', AnswerType.NOT_OBSERVED), R('q3', AnswerType.NOT_OBSERVED),
        R('q4', AnswerType.NOT_OBSERVED), R('q5', AnswerType.NOT_OBSERVED),
      ]);
      expect(d.status).toBe('INSUFFICIENT_DATA');
    });

    it('coverage below the bar is INSUFFICIENT_DATA even with enough items', () => {
      const d = score([
        R('q1', AnswerType.YES), R('q2', AnswerType.YES), R('q3', AnswerType.NOT_OBSERVED),
        R('q4', AnswerType.NOT_OBSERVED), R('q5', AnswerType.NOT_OBSERVED),
      ]);
      expect(d.coverage).toBe(0.4);
      expect(d.status).toBe('INSUFFICIENT_DATA');
    });
  });

  describe('red flags', () => {
    it('NOT_OBSERVED on a red-flag item raises nothing', () => {
      const d = score([
        R('q1', AnswerType.YES), R('q2', AnswerType.YES), R('q3', AnswerType.YES),
        R('q4', AnswerType.YES), R('q5', AnswerType.NOT_OBSERVED),
      ]);
      expect(d.redFlagViolations).toBeUndefined();
    });

    it('NO on a red-flag item does raise one', () => {
      const d = score([
        R('q1', AnswerType.YES), R('q2', AnswerType.YES), R('q3', AnswerType.YES),
        R('q4', AnswerType.YES), R('q5', AnswerType.NO),
      ]);
      expect(d.redFlagViolations).toContain('q5');
    });

    it('a keyworker who positively reports a red flag is heard even when the domain is unobservable', () => {
      const d = score([
        R('q1', AnswerType.NOT_OBSERVED), R('q2', AnswerType.NOT_OBSERVED),
        R('q3', AnswerType.NOT_OBSERVED), R('q4', AnswerType.NOT_OBSERVED),
        R('q5', AnswerType.NO),
      ]);
      expect(d.status).toBe('INSUFFICIENT_DATA');
      expect(d.tier2Required).toBe(true);
      expect(d.tier2Reason).toBe('RED_FLAG');
    });
  });

  describe('persistence: NOT_OBSERVED must not produce NaN', () => {
    // Found by running it: ANSWER_SCORES had no NOT_OBSERVED entry, so `undefined *
    // weight` = NaN went straight to Prisma and the insert died with an opaque error.
    // The scorer was right; the PERSISTENCE path had never heard of the new answer.
    it('calculateQuestionScore(NOT_OBSERVED) is 0, not NaN', () => {
      const v = s.calculateQuestionScore(AnswerType.NOT_OBSERVED, 1.0);
      expect(v).toBe(0);
      expect(Number.isNaN(v)).toBe(false);
    });

    it('every answer type maps to a finite number', () => {
      for (const a of [AnswerType.YES, AnswerType.SOMETIMES, AnswerType.NOT_SURE, AnswerType.NO, AnswerType.NOT_OBSERVED]) {
        expect(Number.isFinite(s.calculateQuestionScore(a, 1.0))).toBe(true);
      }
    });

    it('an unmapped answer throws where the cause is legible', () => {
      expect(() => s.calculateQuestionScore('WAT' as any, 1.0)).toThrow(/No score mapping/);
    });
  });

  describe('the overall score ignores domains nobody could see', () => {
    const mk = (id: string, riskIndex: number, status: any) =>
      ({ domainId: id, domainName: id, riskIndex, status, tier2Required: false, coverage: 1, observedCount: 5, availableCount: 5 }) as any;

    it('an unobservable domain does not drag the mean toward "on track"', () => {
      // Including it (riskIndex 0) would give 0.33 — the less the informant could see,
      // the healthier the child would look.
      expect(s.calculateOverallScore([mk('a', 0.5, 'RED'), mk('b', 0.5, 'RED'), mk('c', 0, 'INSUFFICIENT_DATA')])).toBe(0.5);
      expect(s.calculateOverallScore([mk('a', 0.8, 'RED'), mk('b', 0, 'INSUFFICIENT_DATA'), mk('c', 0, 'INSUFFICIENT_DATA')])).toBe(0.8);
    });
  });
});
