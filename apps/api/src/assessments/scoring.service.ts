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

export interface DomainScore {
    domainId: string;
    domainName: string;
    riskIndex: number;
    status: 'GREEN' | 'YELLOW' | 'RED';
    tier2Required: boolean;
    tier2Reason?: 'RISK_INDEX' | 'RED_FLAG';
    redFlagViolations?: string[];
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
        let totalWeight = 0;
        const redFlagViolations: string[] = [];

        for (const response of responses) {
            const question = questions.find((q) => q.id === response.questionId);
            if (!question) {
                throw new Error(`Question ${response.questionId} not found`);
            }

            // Use inverted scoring for sensory and problem-phrased questions
            const useInverted = domainId && this.needsInvertedScoring(domainId, question);
            const scoreMap = useInverted ? this.INVERTED_ANSWER_SCORES : this.ANSWER_SCORES;
            const answerValue = scoreMap[response.answer];

            totalWeightedScore += answerValue * question.weight;
            totalWeight += question.weight;

            // Check for red flag violations
            // For inverted scoring, YES is a problem, for normal scoring, NO is a problem
            const isProblemAnswer = useInverted
                ? (response.answer === AnswerType.YES || response.answer === AnswerType.NOT_SURE)
                : (response.answer === AnswerType.NO || response.answer === AnswerType.NOT_SURE);

            if (question.redFlag && isProblemAnswer) {
                redFlagViolations.push(question.id);
            }
        }

        const riskIndex = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

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
        let status: 'GREEN' | 'YELLOW' | 'RED';
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
        };
    }

    /**
     * Calculate individual question score
     */
    calculateQuestionScore(answer: AnswerType, weight: number): number {
        const answerValue = this.ANSWER_SCORES[answer];
        return answerValue * weight;
    }

    /**
     * Calculate overall assessment score (average of all domain risk indices)
     */
    calculateOverallScore(domainScores: DomainScore[]): number {
        if (domainScores.length === 0) return 0;

        const totalRiskIndex = domainScores.reduce(
            (sum, domain) => sum + domain.riskIndex,
            0,
        );

        return Math.round((totalRiskIndex / domainScores.length) * 100) / 100;
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
