import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService, DomainScore } from './scoring.service';
import { ReportGeneratorService } from './report-generator.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitTier1ResponsesDto, AnswerType } from './dto/submit-tier1.dto';
import { SubmitTier2ResponsesDto } from './dto/submit-tier2.dto';
import { ShareAssessmentDto } from './dto/share-assessment.dto';
import { AddAnnotationDto } from './dto/add-annotation.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AssessmentsService {
    private readonly logger = new Logger(AssessmentsService.name);
    private questionnaireCache: Map<string, any> = new Map();

    constructor(
        private prisma: PrismaService,
        private scoringService: ScoringService,
        private reportGenerator: ReportGeneratorService,
    ) { }

    /**
     * Load questionnaire configuration from JSON file
     */
    private loadQuestionnaire(ageGroup: string): any {
        if (this.questionnaireCache.has(ageGroup)) {
            return this.questionnaireCache.get(ageGroup);
        }

        const questionnairePath = path.join(
            __dirname,
            'questionnaires',
            `${ageGroup}.json`,
        );

        if (!fs.existsSync(questionnairePath)) {
            throw new BadRequestException(
                `Questionnaire for age group ${ageGroup} not found`,
            );
        }

        const questionnaireData = fs.readFileSync(questionnairePath, 'utf-8');
        const questionnaire = JSON.parse(questionnaireData);
        this.questionnaireCache.set(ageGroup, questionnaire);

        return questionnaire;
    }

    /**
     * Create a new assessment for a child
     */
    async createAssessment(dto: CreateAssessmentDto, userId: string) {
        // Verify child belongs to user
        const child = await this.prisma.child.findUnique({
            where: { id: dto.childId },
            include: { profile: true },
        });

        if (!child) {
            throw new NotFoundException('Child not found');
        }

        if (child.profile.userId !== userId) {
            throw new ForbiddenException('You do not have access to this child');
        }

        // Verify questionnaire exists
        this.loadQuestionnaire(dto.ageGroup);

        // Set expiration to 14 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);

        const assessment = await this.prisma.assessment.create({
            data: {
                childId: dto.childId,
                ageGroup: dto.ageGroup,
                expiresAt,
            },
            include: {
                child: {
                    select: {
                        id: true,
                        firstName: true,
                        dateOfBirth: true,
                    },
                },
            },
        });

        return assessment;
    }

    /**
     * Get assessment by ID
     */
    async getAssessment(assessmentId: string, userId: string) {
        const assessment = await this.prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: {
                child: {
                    include: {
                        profile: true,
                    },
                },
                responses: true,
                shares: {
                    where: { isActive: true },
                    include: {
                        therapist: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        if (!assessment) {
            throw new NotFoundException('Assessment not found');
        }

        // Check access permissions
        const isOwner = assessment.child.profile.userId === userId;
        const isSharedWith = assessment.shares.some(
            (share) => share.sharedWith === userId,
        );

        if (!isOwner && !isSharedWith) {
            throw new ForbiddenException('You do not have access to this assessment');
        }

        return assessment;
    }

    /**
     * Get all assessments for a child
     */
    async getChildAssessments(childId: string, userId: string) {
        const child = await this.prisma.child.findUnique({
            where: { id: childId },
            include: { profile: true },
        });

        if (!child || child.profile.userId !== userId) {
            throw new ForbiddenException('You do not have access to this child');
        }

        const assessments = await this.prisma.assessment.findMany({
            where: { childId },
            include: {
                child: {
                    select: {
                        id: true,
                        firstName: true,
                        dateOfBirth: true,
                    },
                },
                _count: {
                    select: {
                        responses: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return assessments;
    }

    /**
     * Get Tier 1 questionnaire
     */
    async getTier1Questionnaire(assessmentId: string, userId: string) {
        const assessment = await this.getAssessment(assessmentId, userId);
        const questionnaire = this.loadQuestionnaire(assessment.ageGroup);

        // Extract only Tier 1 questions
        const tier1Questions = questionnaire.domains.map((domain: any) => ({
            domainId: domain.id,
            domainName: domain.name,
            description: domain.description,
            questions: domain.tier1,
        }));

        return {
            ageGroup: questionnaire.ageGroup,
            displayName: questionnaire.displayName,
            estimatedTime: questionnaire.estimatedTime.tier1,
            domains: tier1Questions,
        };
    }

    /**
     * Get Tier 2 questionnaire (only for flagged domains)
     */
    async getTier2Questionnaire(assessmentId: string, userId: string) {
        const assessment = await this.getAssessment(assessmentId, userId);

        if (!assessment.tier1Completed) {
            throw new BadRequestException('Tier 1 must be completed first');
        }

        if (assessment.flaggedDomains.length === 0) {
            throw new BadRequestException('No domains flagged for Tier 2');
        }

        const questionnaire = this.loadQuestionnaire(assessment.ageGroup);

        // Extract only Tier 2 questions for flagged domains
        const tier2Questions = questionnaire.domains
            .filter((domain: any) => assessment.flaggedDomains.includes(domain.id))
            .map((domain: any) => ({
                domainId: domain.id,
                domainName: domain.name,
                description: domain.description,
                questions: domain.tier2,
            }));

        return {
            ageGroup: questionnaire.ageGroup,
            displayName: questionnaire.displayName,
            estimatedTime: questionnaire.estimatedTime.tier2PerDomain,
            flaggedDomains: assessment.flaggedDomains,
            domains: tier2Questions,
        };
    }

    /**
     * Submit Tier 1 responses
     */
    async submitTier1Responses(
        assessmentId: string,
        dto: SubmitTier1ResponsesDto,
        userId: string,
    ) {
        const assessment = await this.getAssessment(assessmentId, userId);

        if (assessment.tier1Completed) {
            throw new BadRequestException('Tier 1 already completed');
        }

        const questionnaire = this.loadQuestionnaire(assessment.ageGroup);
        const domainScores: DomainScore[] = [];
        const flaggedDomains: string[] = [];
        const allResponsesToCreate: any[] = []; // Collect all responses for batch insert

        // Process each domain
        for (const domain of questionnaire.domains) {
            const domainResponses = dto.responses.filter((r) =>
                domain.tier1.some((q: any) => q.id === r.questionId),
            );

            if (domainResponses.length === 0) continue;

            // Calculate domain score
            const score = this.scoringService.calculateDomainScore(
                domainResponses,
                domain.tier1,
                domain.id, // Pass domain ID for inverted scoring logic
            );
            score.domainId = domain.id;
            score.domainName = domain.name;

            domainScores.push(score);

            if (score.tier2Required) {
                flaggedDomains.push(domain.id);
            }

            // Collect responses for batch insert
            for (const response of domainResponses) {
                const question = domain.tier1.find((q: any) => q.id === response.questionId);
                const questionScore = this.scoringService.calculateQuestionScore(
                    response.answer,
                    question.weight,
                );

                allResponsesToCreate.push({
                    assessmentId,
                    tier: 1,
                    domain: domain.id,
                    questionId: response.questionId,
                    answer: response.answer,
                    score: questionScore,
                });
            }
        }

        // Batch insert all responses at once
        if (allResponsesToCreate.length > 0) {
            await this.prisma.assessmentResponse.createMany({
                data: allResponsesToCreate,
            });
        }

        // Calculate overall score
        const overallScore = this.scoringService.calculateOverallScore(domainScores);

        // Prepare domain scores for JSON storage
        const domainScoresJson = domainScores.reduce((acc, score) => {
            acc[score.domainId] = {
                riskIndex: score.riskIndex,
                status: score.status,
                tier2Required: score.tier2Required,
                tier2Reason: score.tier2Reason,
            };
            return acc;
        }, {} as Record<string, any>);

        // Update assessment
        const updatedAssessment = await this.prisma.assessment.update({
            where: { id: assessmentId },
            data: {
                tier1Completed: true,
                tier1CompletedAt: new Date(),
                status: flaggedDomains.length > 0 ? 'TIER2_REQUIRED' : 'COMPLETED',
                flaggedDomains,
                domainScores: domainScoresJson,
                overallScore,
                completedAt: flaggedDomains.length === 0 ? new Date() : undefined,
            },
        });

        return {
            tier2Required: flaggedDomains.length > 0,
            flaggedDomains,
            domainScores,
            overallScore,
            assessment: updatedAssessment,
        };
    }

    /**
     * Submit Tier 2 responses
     */
    async submitTier2Responses(
        assessmentId: string,
        dto: SubmitTier2ResponsesDto,
        userId: string,
    ) {
        const assessment = await this.getAssessment(assessmentId, userId);

        if (!assessment.tier1Completed) {
            throw new BadRequestException('Tier 1 must be completed first');
        }

        if (assessment.tier2Completed) {
            throw new BadRequestException('Tier 2 already completed');
        }

        const questionnaire = this.loadQuestionnaire(assessment.ageGroup);
        const allResponsesToCreate: any[] = []; // Collect all responses for batch insert

        // Collect Tier 2 responses
        for (const response of dto.responses) {
            // Find which domain this question belongs to
            const domain = questionnaire.domains.find((d: any) =>
                d.tier2.some((q: any) => q.id === response.questionId),
            );

            if (!domain) continue;

            const question = domain.tier2.find((q: any) => q.id === response.questionId);
            const questionScore = this.scoringService.calculateQuestionScore(
                response.answer,
                question.weight,
            );

            allResponsesToCreate.push({
                assessmentId,
                tier: 2,
                domain: domain.id,
                questionId: response.questionId,
                answer: response.answer,
                score: questionScore,
            });
        }

        // Batch insert all Tier 2 responses
        if (allResponsesToCreate.length > 0) {
            await this.prisma.assessmentResponse.createMany({
                data: allResponsesToCreate,
            });
        }

        // Update assessment
        const updatedAssessment = await this.prisma.assessment.update({
            where: { id: assessmentId },
            data: {
                tier2Completed: true,
                tier2CompletedAt: new Date(),
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        });

        return {
            completed: true,
            assessment: updatedAssessment,
        };
    }

    /**
     * Share assessment with therapist
     */
    async shareAssessment(
        assessmentId: string,
        dto: ShareAssessmentDto,
        userId: string,
    ) {
        const assessment = await this.getAssessment(assessmentId, userId);

        // Verify therapist exists and get User ID
        const therapistProfile = await this.prisma.therapistProfile.findUnique({
            where: { id: dto.therapistId },
            include: { user: true }
        });

        if (!therapistProfile) {
            throw new NotFoundException('Therapist not found');
        }

        const therapistUserId = therapistProfile.userId;

        // Check if already shared
        const existingShare = await this.prisma.assessmentShare.findUnique({
            where: {
                assessmentId_sharedWith: {
                    assessmentId,
                    sharedWith: therapistUserId,
                },
            },
        });

        if (existingShare) {
            // Reactivate if previously deactivated
            if (!existingShare.isActive) {
                return await this.prisma.assessmentShare.update({
                    where: { id: existingShare.id },
                    data: { isActive: true, sharedAt: new Date() },
                });
            }
            throw new BadRequestException('Assessment already shared with this therapist');
        }

        // Create share
        const share = await this.prisma.assessmentShare.create({
            data: {
                assessmentId,
                sharedBy: userId,
                sharedWith: therapistUserId,
                accessLevel: dto.accessLevel || 'VIEW',
            },
            include: {
                therapist: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // TODO: Send notification to therapist

        return share;
    }

    /**
     * Get assessments shared with current user (therapist view)
     */
    async getSharedAssessments(userId: string) {
        const shares = await this.prisma.assessmentShare.findMany({
            where: {
                sharedWith: userId,
                isActive: true,
            },
            include: {
                assessment: {
                    include: {
                        child: {
                            select: {
                                id: true,
                                firstName: true,
                                dateOfBirth: true,
                            },
                        },
                    },
                },
                parent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { sharedAt: 'desc' },
        });

        return shares;
    }

    /**
     * Add annotation to shared assessment
     */
    async addAnnotation(
        assessmentId: string,
        dto: AddAnnotationDto,
        userId: string,
    ) {
        // Verify user has access to this assessment
        const share = await this.prisma.assessmentShare.findFirst({
            where: {
                assessmentId,
                sharedWith: userId,
                isActive: true,
            },
        });

        if (!share) {
            throw new ForbiddenException('You do not have access to this assessment');
        }

        if (share.accessLevel !== 'ANNOTATE') {
            throw new ForbiddenException('You do not have annotation permissions');
        }

        // Get existing annotations or create new structure
        const existingAnnotations = (share.annotations as any) || { notes: [] };

        const newAnnotation = {
            id: Date.now().toString(),
            notes: dto.notes,
            domain: dto.domain,
            questionId: dto.questionId,
            sectionId: dto.sectionId,
            metadata: dto.metadata,
            createdAt: new Date().toISOString(),
            createdBy: userId,
        };

        existingAnnotations.notes = [
            ...(existingAnnotations.notes || []),
            newAnnotation,
        ];

        // Update share with new annotation
        const updatedShare = await this.prisma.assessmentShare.update({
            where: { id: share.id },
            data: {
                annotations: existingAnnotations,
            },
        });

        return updatedShare;
    }

    /**
     * Delete assessment
     */
    async deleteAssessment(assessmentId: string, userId: string) {
        const assessment = await this.getAssessment(assessmentId, userId);

        // Delete all related data (responses, shares, etc.)
        await this.prisma.assessment.delete({
            where: { id: assessmentId },
        });

        return { success: true };
    }

    /**
     * Revoke assessment share
     */
    async revokeShare(
        assessmentId: string,
        therapistId: string,
        userId: string,
    ) {
        const assessment = await this.getAssessment(assessmentId, userId);

        const share = await this.prisma.assessmentShare.findUnique({
            where: {
                assessmentId_sharedWith: {
                    assessmentId,
                    sharedWith: therapistId,
                },
            },
        });

        if (!share) {
            throw new NotFoundException('Share not found');
        }

        await this.prisma.assessmentShare.update({
            where: { id: share.id },
            data: { isActive: false },
        });

        return { success: true };
    }

    /**
     * Get report data (JSON format)
     */
    async getReportData(assessmentId: string, userId: string) {
        const assessment = await this.getAssessment(assessmentId, userId);

        if (assessment.status !== 'COMPLETED') {
            throw new BadRequestException('Assessment must be completed to view report');
        }

        const questionnaire = this.loadQuestionnaire(assessment.ageGroup);

        // Import helpers
        const {
            calculateZone,
            generateDomainInterpretation,
            generateRecommendations,
            calculateDevelopmentalAge,
            generateOverallInterpretation,
        } = require('./assessment-helpers');

        // Calculate child's age in months
        const childAgeMonths = Math.floor(
            (Date.now() - new Date(assessment.child.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        );

        // Prepare domain scores array with enhanced data
        const domainScoresArray = Object.entries(assessment.domainScores as any).map(
            ([domainId, data]: [string, any]) => {
                const zone = calculateZone(data.riskIndex);
                const domainName = this.formatDomainName(domainId);

                return {
                    domainId,
                    domainName,
                    riskIndex: data.riskIndex,
                    status: data.status,
                    zone,
                    tier2Required: data.tier2Required,
                    tier2Reason: data.tier2Reason,
                    interpretation: generateDomainInterpretation(domainId, domainName, data.riskIndex, zone),
                    recommendations: generateRecommendations(domainId, domainName, zone),
                    ageEquivalent: undefined, // Can be enhanced with domain-specific age calculations
                };
            },
        );

        // Get recommendations
        const recommendations = this.scoringService.getRecommendations(domainScoresArray);

        // Calculate developmental age equivalent
        // Convert risk index to development score (lower risk = higher development)
        const totalRiskIndex = domainScoresArray.reduce((sum, d) => sum + d.riskIndex, 0);
        const averageRiskIndex = totalRiskIndex / domainScoresArray.length;

        // Convert risk index to percentage (0.0 risk = 100%, 1.0 risk = 0%)
        const developmentPercentage = (1 - averageRiskIndex) * 100;

        const developmentalAgeEquivalent = calculateDevelopmentalAge(
            developmentPercentage,
            100,
            childAgeMonths
        );

        // Count flagged domains
        const flaggedDomainsCount = domainScoresArray.filter(d => d.zone === 'yellow' || d.zone === 'red').length;

        // Generate overall interpretation
        const overallInterpretation = generateOverallInterpretation(
            developmentPercentage,
            100,
            flaggedDomainsCount,
            domainScoresArray.length
        );

        return {
            assessment: {
                id: assessment.id,
                status: assessment.status,
                completedAt: assessment.completedAt,
                overallScore: assessment.overallScore,
            },
            child: {
                id: assessment.child.id,
                firstName: assessment.child.firstName,
                dateOfBirth: assessment.child.dateOfBirth,
            },
            ageGroup: questionnaire.displayName,
            domainScores: domainScoresArray,
            recommendations,
            responses: assessment.responses.map((r: any) => {
                // Look up question text from questionnaire
                for (const domain of questionnaire.domains) {
                    const t1 = domain.tier1?.find((q: any) => q.id === r.questionId);
                    if (t1) return { ...r, question: t1.question };
                    const t2 = domain.tier2?.find((q: any) => q.id === r.questionId);
                    if (t2) return { ...r, question: t2.question };
                }
                return r;
            }),
            developmentalAgeEquivalent,
            overallInterpretation,
        };
    }

    /**
     * Download PDF report
     */
    async downloadReport(
        assessmentId: string,
        reportType: 'SUMMARY' | 'DETAILED',
        userId: string,
    ) {
        // Verify access
        await this.getAssessment(assessmentId, userId);

        // Generate PDF using report generator service
        const result = await this.reportGenerator.generateReport(
            assessmentId,
            reportType,
        );

        return result;
    }

    /**
     * Get screening history for a child (longitudinal trend data).
     * Access: child's parent, or THERAPIST/ADMIN role.
     */
    async getScreeningHistory(childId: string, userId: string, userRole: string) {
        const child = await this.prisma.child.findUnique({
            where: { id: childId },
            include: { profile: true },
        });

        if (!child) {
            throw new NotFoundException('Child not found');
        }

        const isParent = child.profile.userId === userId;
        const isProfessionalOrAdmin =
            userRole === 'THERAPIST' || userRole === 'EDUCATOR' || userRole === 'ADMIN';

        if (!isParent && !isProfessionalOrAdmin) {
            throw new ForbiddenException('You do not have access to this child');
        }

        const assessments = await this.prisma.assessment.findMany({
            where: {
                childId,
                status: 'COMPLETED',
                NOT: { domainScores: { equals: Prisma.DbNull } },
            },
            select: {
                id: true,
                completedAt: true,
                overallScore: true,
                domainScores: true,
            },
            orderBy: { completedAt: 'asc' },
        });

        return {
            childId,
            childName: child.firstName,
            results: assessments.map((a) => {
                const scores = a.domainScores as Record<string, any>;
                return {
                    id: a.id,
                    completedAt: a.completedAt?.toISOString() ?? a.completedAt,
                    totalScore: a.overallScore ?? 0,
                    domains: Object.entries(scores).map(([domainId, data]) => ({
                        name: this.formatDomainName(domainId),
                        domainId,
                        score: Math.round((1 - (data.riskIndex ?? 0)) * 100),
                        maxScore: 100,
                    })),
                };
            }),
        };
    }

    /**
     * Format domain ID to readable name
     */
    private formatDomainName(domainId: string): string {
        const names: Record<string, string> = {
            grossMotor: 'Gross Motor',
            fineMotor: 'Fine Motor',
            speechLanguage: 'Speech & Language',
            socialEmotional: 'Social-Emotional',
            cognitiveLearning: 'Cognitive',
            adaptiveSelfCare: 'Self-Care',
            sensoryProcessing: 'Sensory',
            visionHearing: 'Vision & Hearing',
        };
        return names[domainId] || domainId;
    }
}
