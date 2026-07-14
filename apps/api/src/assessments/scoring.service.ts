import { Injectable } from '@nestjs/common';
import { AnswerType } from './dto/submit-tier1.dto';

export interface Question {
    id: string;
    question: string;
    weight: number;
    redFlag: boolean;
    construct: string;
    sources: string[];
    whyWeAsk: string;
    invertScoring?: boolean; // For questions phrased as problems (e.g., sensory)
}

export interface QuestionResponse {
    questionId: string;
    answer: AnswerType;
}

/**
 * INSUFFICIENT_DATA is not a fourth colour on the same scale — it means the question
 * "how is this child doing in this domain?" was never actually answered, because the
 * informant could not observe enough of it. It must never be treated as GREEN.
 */
export type DomainStatus = 'GREEN' | 'YELLOW' | 'RED' | 'INSUFFICIENT_DATA';

export interface DomainScore {
    domainId: string;
    domainName: string;
    /** Weighted mean over OBSERVED items only. Meaningless when status is INSUFFICIENT_DATA. */
    riskIndex: number;
    status: DomainStatus;
    tier2Required: boolean;
    tier2Reason?: 'RISK_INDEX' | 'RED_FLAG';
    redFlagViolations?: string[];
    /** Share of the domain's available weight the informant could actually observe (0–1). */
    coverage: number;
    observedCount: number;
    availableCount: number;
}

@Injectable()
export class ScoringService {
    // Standard scoring: YES=good (0.0), NO=concern (1.0)
    private readonly ANSWER_SCORES = {
        [AnswerType.YES]: 0.0,
        [AnswerType.SOMETIMES]: 0.4,
        [AnswerType.NOT_SURE]: 0.7,
        [AnswerType.NO]: 1.0,
    };

    // Inverted scoring for problem-phrased questions: YES=concern (1.0), NO=good (0.0)
    private readonly INVERTED_ANSWER_SCORES = {
        [AnswerType.YES]: 1.0,
        [AnswerType.SOMETIMES]: 0.6,
        [AnswerType.NOT_SURE]: 0.7,
        [AnswerType.NO]: 0.0,
    };

    private readonly TIER2_THRESHOLD = 0.46;
    private readonly GREEN_MAX = 0.29;
    private readonly YELLOW_MAX = 0.45;

    /**
     * How much of a domain an informant must actually have observed before we are
     * willing to say anything about it at all.
     *
     * WHY THIS EXISTS: the risk index is a weighted MEAN over answered items, so a
     * domain with nothing answered used to come out at 0 — which is GREEN, "your
     * child is developing well in this area". Silence read as reassurance. That was
     * survivable while only parents screened (a parent sees their child in every
     * context, so they answer nearly everything). It is not survivable now an
     * educator can screen, because a keyworker has real, permanent blind spots:
     * sleep, mealtimes at home, family play. Without this rule, the domains a
     * teacher cannot see would come back green.
     */
    private readonly MIN_COVERAGE = 0.6;
    /** And a verdict on a domain from one or two items is not a verdict. */
    private readonly MIN_OBSERVED_ITEMS = 2;

    /**
     * Determine if a question needs inverted scoring based on domain
     * Sensory and some other domains phrase questions as problems
     */
    private needsInvertedScoring(domainId: string, question: Question): boolean {
        // Sensory questions are phrased as problems ("Is your child overly sensitive...")
        if (domainId === 'sensoryProcessing') {
            return true;
        }
        // Check if question explicitly marks inverted scoring
        if (question.invertScoring) {
            return true;
        }
        return false;
    }

    /**
     * Calculate domain risk index based on weighted scoring
     * Formula: Sum(answer_value × weight) / Sum(weights)
     */
    calculateDomainScore(
        responses: QuestionResponse[],
        questions: Question[],
        domainId?: string,
    ): DomainScore {
        let totalWeightedScore = 0;
        let observedWeight = 0;
        let availableWeight = 0;
        let observedCount = 0;
        const redFlagViolations: string[] = [];

        for (const response of responses) {
            const question = questions.find((q) => q.id === response.questionId);
            if (!question) {
                throw new Error(`Question ${response.questionId} not found`);
            }

            availableWeight += question.weight;

            // NOT_OBSERVED is not an answer — it is the absence of one. It contributes
            // to NEITHER the numerator nor the denominator, and it can never raise a
            // red flag. "I have no way of seeing this" is not evidence of concern, and
            // scoring it as though it were is how you manufacture a worried teacher.
            if (response.answer === AnswerType.NOT_OBSERVED) {
                continue;
            }

            // Use inverted scoring for sensory and problem-phrased questions
            const useInverted = domainId && this.needsInvertedScoring(domainId, question);
            const scoreMap = useInverted ? this.INVERTED_ANSWER_SCORES : this.ANSWER_SCORES;
            const answerValue = scoreMap[response.answer];

            totalWeightedScore += answerValue * question.weight;
            observedWeight += question.weight;
            observedCount += 1;

            // Check for red flag violations
            // For inverted scoring, YES is a problem, for normal scoring, NO is a problem
            const isProblemAnswer = useInverted
                ? (response.answer === AnswerType.YES || response.answer === AnswerType.NOT_SURE)
                : (response.answer === AnswerType.NO || response.answer === AnswerType.NOT_SURE);

            if (question.redFlag && isProblemAnswer) {
                redFlagViolations.push(question.id);
            }
        }

        const coverage = availableWeight > 0 ? observedWeight / availableWeight : 0;
        const riskIndex = observedWeight > 0 ? totalWeightedScore / observedWeight : 0;

        // Did the informant see enough of this domain for the number to mean anything?
        // If not we say so, rather than reporting a mean over the two items they
        // happened to be able to answer — and CRUCIALLY rather than falling through to
        // riskIndex 0, which reads as GREEN.
        const insufficient =
            observedCount < this.MIN_OBSERVED_ITEMS || coverage < this.MIN_COVERAGE;

        if (insufficient) {
            return {
                domainId: '',
                domainName: '',
                riskIndex: Math.round(riskIndex * 100) / 100,
                status: 'INSUFFICIENT_DATA',
                // A red flag still counts even here: a keyworker who positively
                // reports a red-flag item is telling us something real, and we are not
                // going to discard it because they could not answer their colleagues'
                // questions about bedtime.
                tier2Required: redFlagViolations.length > 0,
                tier2Reason: redFlagViolations.length > 0 ? 'RED_FLAG' : undefined,
                redFlagViolations: redFlagViolations.length > 0 ? redFlagViolations : undefined,
                coverage: Math.round(coverage * 100) / 100,
                observedCount,
                availableCount: responses.length,
            };
        }

        // Determine if Tier 2 is required
        let tier2Required = false;
        let tier2Reason: 'RISK_INDEX' | 'RED_FLAG' | undefined;

        if (riskIndex >= this.TIER2_THRESHOLD) {
            tier2Required = true;
            tier2Reason = 'RISK_INDEX';
        } else if (redFlagViolations.length > 0) {
            tier2Required = true;
            tier2Reason = 'RED_FLAG';
        }

        // Determine status color
        let status: DomainStatus;
        if (riskIndex <= this.GREEN_MAX) {
            status = 'GREEN';
        } else if (riskIndex <= this.YELLOW_MAX) {
            status = 'YELLOW';
        } else {
            status = 'RED';
        }

        return {
            domainId: '', // Will be set by caller
            domainName: '', // Will be set by caller
            riskIndex: Math.round(riskIndex * 100) / 100, // Round to 2 decimals
            status,
            tier2Required,
            tier2Reason,
            redFlagViolations: redFlagViolations.length > 0 ? redFlagViolations : undefined,
            coverage: Math.round(coverage * 100) / 100,
            observedCount,
            availableCount: responses.length,
        };
    }

    /**
     * Calculate individual question score
     */
    calculateQuestionScore(answer: AnswerType, weight: number): number {
        // NOT_OBSERVED has no score, because it is not an observation. It is persisted as
        // 0 purely so the row can exist — the ANSWER column is the source of truth, and
        // `calculateDomainScore` excludes these from the numerator AND the denominator.
        //
        // Anything that later aggregates `AssessmentResponse.score` MUST filter these out
        // first, or it will read "not seen" as "doing fine".
        if (answer === AnswerType.NOT_OBSERVED) return 0;

        const answerValue = this.ANSWER_SCORES[answer];

        // An unmapped answer used to produce `undefined * weight` = NaN, which sailed
        // straight through to Prisma and blew up on insert with an opaque error. Fail
        // here, where the cause is legible, rather than three layers down.
        if (answerValue === undefined) {
            throw new Error(`No score mapping for answer "${answer}"`);
        }

        return answerValue * weight;
    }

    /**
     * Calculate overall assessment score (average of all domain risk indices)
     */
    calculateOverallScore(domainScores: DomainScore[]): number {
        // Average over SCORED domains only. Including an INSUFFICIENT_DATA domain would
        // fold its riskIndex (often 0, because barely anything was observed) into the
        // mean and pull the overall score toward "on track" — the same bug as the
        // domain-level one, one level up: the less the informant could see, the
        // healthier the child would look.
        const scored = domainScores.filter((d) => d.status !== 'INSUFFICIENT_DATA');

        if (scored.length === 0) return 0;

        const totalRiskIndex = scored.reduce((sum, domain) => sum + domain.riskIndex, 0);

        return Math.round((totalRiskIndex / scored.length) * 100) / 100;
    }

    /**
     * Get interpretation text based on risk index
     */
    getInterpretation(riskIndex: number, domainName: string): string {
        if (riskIndex <= this.GREEN_MAX) {
            return `${domainName}: Your child is developing well in this area. Continue to support their growth through play and daily activities.`;
        } else if (riskIndex <= this.YELLOW_MAX) {
            return `${domainName}: Your child is showing some areas that may benefit from extra attention. Consider discussing with your pediatrician or therapist.`;
        } else {
            return `${domainName}: This area may need additional support. We recommend consulting with a developmental specialist or therapist for further evaluation.`;
        }
    }

    /**
     * Get recommendations based on flagged domains
     */
    getRecommendations(domainScores: DomainScore[]): string[] {
        const recommendations: string[] = [];
        const redDomains = domainScores.filter((d) => d.status === 'RED');
        const yellowDomains = domainScores.filter((d) => d.status === 'YELLOW');

        if (redDomains.length > 0) {
            recommendations.push(
                'Schedule a consultation with a developmental specialist to discuss areas of concern.',
            );
            recommendations.push(
                'Consider early intervention services which can significantly support your child\'s development.',
            );
        }

        if (yellowDomains.length > 0) {
            recommendations.push(
                'Monitor these areas closely and provide enriched activities to support development.',
            );
            recommendations.push(
                'Discuss your observations with your pediatrician at the next visit.',
            );
        }

        if (redDomains.length === 0 && yellowDomains.length === 0) {
            recommendations.push(
                'Your child is developing well! Continue with regular developmental check-ups.',
            );
            recommendations.push(
                'Keep engaging in age-appropriate play and learning activities.',
            );
        }

        return recommendations;
    }
}
