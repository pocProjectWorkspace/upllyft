import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
// removed direct ChartJSNodeCanvas import
import * as fs from 'fs';
import * as path from 'path';
import { ACTIVITY_PLAYBOOK } from './activity-playbook';
import { renderV2Report } from './pdf/pdf-report-v2.renderer';

@Injectable()
export class ReportGeneratorV2Service {
    private readonly logger = new Logger(ReportGeneratorV2Service.name);
    private openai: OpenAI;
    private chartJSNodeCanvas: any;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        this.openai = new OpenAI({
            apiKey,
            timeout: 180000 // 180 seconds timeout for long synthesis
        });

        // Initialize chart canvas lazily when needed
    }

    /**
     * Get or Generate V2 Report
     */
    async getOrGenerateV2Report(assessmentId: string, regenerate: boolean = false): Promise<any> {
        if (!regenerate) {
            const existingReport = await this.prisma.assessmentReport.findFirst({
                where: {
                    assessmentId,
                    reportType: 'ENHANCED'
                },
                orderBy: { generatedAt: 'desc' }
            });

            if (existingReport && (existingReport as any).v2Content) {
                this.logger.log(`Found existing V2 report for assessment ${assessmentId}`);
                return (existingReport as any).v2Content;
            }
        }

        return this.generateV2Report(assessmentId);
    }

    /**
     * Generate Enhanced V2 Report (JSON)
     */
    async generateV2Report(assessmentId: string): Promise<any> {
        this.logger.log(`Generating V2 Report for assessment ${assessmentId}`);

        // 1. Fetch Assessment with full context
        const assessment = await this.prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: {
                child: {
                    include: {
                        conditions: true,
                    },
                },
                responses: true,
            },
        });

        if (!assessment) {
            throw new NotFoundException('Assessment not found');
        }

        // 2. Load Playbook and Spec rules
        const rulesPath = path.join(__dirname, 'dto', 'Report Generation Rules');
        this.logger.debug(`Loading rules from resolved path: ${rulesPath}`);

        // Debugging directory contents if path not found
        if (!fs.existsSync(rulesPath)) {
            this.logger.error(`Rules directory not found at: ${rulesPath}`);
            this.logger.debug(`Current __dirname: ${__dirname}`);
            try {
                const parentDir = path.join(__dirname, 'dto');
                if (fs.existsSync(parentDir)) {
                    this.logger.debug(`Contents of ${parentDir}: ${fs.readdirSync(parentDir).join(', ')}`);
                } else {
                    this.logger.debug(`Parent directory ${parentDir} does not exist`);
                }
            } catch (e) {
                this.logger.error(`Error listing directory: ${e.message}`);
            }
            throw new NotFoundException(`Rules directory not found at: ${rulesPath}`);
        }

        let spec, playbook, logicBank;
        try {
            this.logger.log('📂 Loading Markdown Rules...');
            spec = fs.readFileSync(path.join(rulesPath, 'SCREENING_REPORT_V2_SPEC.md'), 'utf-8');
            playbook = fs.readFileSync(path.join(rulesPath, 'SCREENING_REPORT_V2_DOMAIN_PLAYBOOK.md'), 'utf-8');
            logicBank = fs.readFileSync(path.join(rulesPath, 'CLINICAL_LOGIC_BANK.md'), 'utf-8');
            this.logger.log('✅ Rules loaded successfully');
        } catch (e) {
            this.logger.error(`Failed to load markdown rules: ${e.message}`);
            throw e;
        }

        // 3. Prepare AI Data Payload
        const child = assessment.child;

        const childData = {
            child: {
                firstName: child.firstName,
                nickname: child.nickname,
                dob: child.dateOfBirth,
                age: this.calculateAge(child.dateOfBirth),
                gender: child.gender,
                birthOrder: child.birthOrder,
                nationality: child.nationality,
                placeOfBirth: child.placeOfBirth,
                city: child.city,
                state: child.state,
                primaryLanguages: [child.primaryLanguage],
                caregiverRelationship: child.caregiverRelationship,
                hasDiagnosedOrSuspectedNeurodivergence: child.hasCondition,
                diagnosisStatus: child.diagnosisStatus,
            },
            education: {
                schoolName: child.currentSchool,
                gradeLevel: child.grade,
                schoolType: child.schoolType,
                mediumOfInstruction: child.mediumOfInstruction,
                attendancePattern: child.attendancePattern,
                teacherConcernsText: child.teacherConcerns,
                learningDifficultiesText: child.learningDifficulties,
            },
            birthHistory: {
                motherHealthDuringPregnancyText: child.mothersHealthDuringPregnancy,
                deliveryType: child.deliveryType,
                prematureBirthFlag: child.prematureBirth,
                gestationalAgeWeeks: child.gestationalAge,
                birthWeight: child.birthWeight,
                complicationsText: child.birthComplications,
                delayedMilestonesFlag: child.delayedMilestones,
                delayedMilestonesText: child.delayedMilestonesDetails,
            },
            medical: {
                diagnosedMedicalConditionsText: child.currentMedicalConditions,
                visionHearingIssuesText: child.visionHearingIssues,
                takingMedicationsFlag: child.takingMedications,
                medicationsListText: child.medicationDetails,
                familyHistoryDevDisordersText: child.familyHistoryOfDevelopmentalDisorders,
                sleepIssuesFlag: child.sleepIssues,
                sleepDetailsText: child.sleepDetails,
                eatingDietaryConcernsFlag: child.eatingIssues,
                eatingDetailsText: child.eatingDetails,
                additionalConcernsText: child.developmentalConcerns,
                previousAssessmentsFlag: child.previousAssessments,
                referralSource: child.referralSource,
            },
            diagnosis: child.conditions.map(c => ({
                conditionType: c.conditionType,
                specificDiagnosisText: c.specificDiagnosis,
                severity: c.severity,
                diagnosedBy: c.diagnosedBy,
                diagnosedAt: c.diagnosedAt,
                currentTherapies: c.currentTherapies,
                medications: c.medications,
                primaryChallenges: c.primaryChallenges,
                strengths: c.strengths,
                notes: c.notes,
            })),
        };

        // Build per-domain response summaries from actual question-level answers
        const responseSummary: Record<string, { tier1: { yes: number; no: number; sometimes: number; total: number }; tier2: { yes: number; no: number; sometimes: number; total: number } }> = {};
        for (const r of assessment.responses) {
            if (!responseSummary[r.domain]) {
                responseSummary[r.domain] = {
                    tier1: { yes: 0, no: 0, sometimes: 0, total: 0 },
                    tier2: { yes: 0, no: 0, sometimes: 0, total: 0 },
                };
            }
            const tier = r.tier === 1 ? 'tier1' : 'tier2';
            responseSummary[r.domain][tier].total++;
            const answer = r.answer;
            if (answer === 'YES') responseSummary[r.domain][tier].yes++;
            else if (answer === 'NO') responseSummary[r.domain][tier].no++;
            else responseSummary[r.domain][tier].sometimes++; // SOMETIMES or NOT_SURE
        }

        const screeningResults = {
            metadata: {
                assessmentDate: assessment.completedAt || assessment.createdAt,
                ageGroupAssessed: assessment.ageGroup,
                status: assessment.status,
            },
            overall: {
                overallDevelopmentPercent: assessment.overallScore ? Math.round(assessment.overallScore * 10000) / 100 : 0,
                overallZone: this.calculateZone(assessment.overallScore || 0),
                domainsRequiringAttentionCount: assessment.flaggedDomains.length,
                domainsRequiringAttentionList: assessment.flaggedDomains,
            },
            domains: Object.entries(assessment.domainScores as any || {}).map(([domainId, data]: [string, any]) => ({
                domainName: domainId,
                developmentScorePercent: Math.round((1 - data.riskIndex) * 10000) / 100,
                zone: data.status,
                riskIndexPercent: Math.round(data.riskIndex * 10000) / 100,
                tierTriggered: data.tier2Required ? 'Tier2Completed' : 'Tier1Only',
                responseSummary: responseSummary[domainId] || null,
                seedActivities: ACTIVITY_PLAYBOOK[assessment.ageGroup]?.[domainId] || [],
            })),
        };

        // Log payload completeness for debugging
        const filledChildFields = Object.entries(childData).reduce((count, [, section]) => {
            if (Array.isArray(section)) return count + section.length;
            if (typeof section === 'object' && section !== null) {
                return count + Object.values(section).filter(v => v !== null && v !== undefined && v !== '').length;
            }
            return count;
        }, 0);
        this.logger.log(`📊 Child profile richness: ${filledChildFields} populated fields, ${child.conditions.length} conditions, ${assessment.responses.length} responses across ${Object.keys(responseSummary).length} domains`);

        // 4. Construct AI Prompt
        const prompt = `
You are a context-aware developmental screening interpretation assistant.
Your goal is to produce a V2 Screening Report based on the following SPEC and PLAYBOOK.

### SPECIFICATION
${spec}

### CLINICAL LOGIC BANK (Mental Models)
${logicBank}

### DOMAIN PLAYBOOK
${playbook}

### INPUT DATA
CHILD PROFILE:
${JSON.stringify(childData, null, 2)}

### SCREENING RESULTS:
${JSON.stringify(screeningResults, null, 2)}

### INSTRUCTIONS
1. Follow the tone and forbidden language rules strictly.
2. USE THE CLINICAL LOGIC BANK to find correlations between Child Profile and Screening Results.
3. Synthesize the context (e.g. prematurity, school concerns) into the domain interpretations.
4. Set confidence levels based on profile completeness. The child profile data above contains ALL fields from the database — treat any field that is non-null as REAL DATA provided by the parent. Do NOT say "limited data" or "absence of details" if the fields are populated.
5. Return ONLY a valid JSON object matching the skeleton in the SPEC.
6. **MANDATORY**: 'domainDeepDives' array MUST contain entries for EVERY domain present in SCREENING RESULTS. Do not summarize or skip.
7. Populate 'metadata.dataUsed' listing every non-null section from the INPUT DATA (e.g. "birthHistory", "education", "medical", "diagnosis", "responseSummary").
8. Frame all findings as support pathways, not diagnoses.
9. **DATA INTEGRITY**: Carefully read ALL provided child profile fields including birthHistory, medical, education, diagnosis (with primaryChallenges, strengths, therapies, medications), sleepDetails, eatingDetails, and the per-domain responseSummary. Reference specific data points from the profile in your narrative — do not generalize or claim data is missing when it is present.
10. The 'responseSummary' per domain shows how many questions the parent answered Yes/No/Sometimes at each tier. Use this to understand the nuance of each domain score — a domain with many "Sometimes" answers has a different clinical meaning than one with many "No" answers.
`;
        this.logger.debug('Prepared AI Data Payload');
        this.logger.verbose(`Prompt Length: ${prompt.length} chars`);

        // 5. Call AI
        try {
            this.logger.log('🚀 Sending request to OpenAI (Timeout: 180s)...');
            const startTime = Date.now();

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                response_format: { type: 'json_object' },
            });

            const duration = (Date.now() - startTime) / 1000;
            this.logger.log(`✅ Received response from OpenAI in ${duration}s`);

            this.logger.debug('Received response from OpenAI');
            const content = response.choices[0]?.message?.content || '{}';
            this.logger.verbose(`AI Response: ${content} `);

            let reportContent;
            try {
                reportContent = JSON.parse(content);
                this.logger.debug('Successfully parsed AI JSON response');
            } catch (parseError) {
                this.logger.error('JSON Parse Error. Content was:', content);
                throw new Error(`Failed to parse AI response JSON: ${parseError.message}`);
            }

            // 6. Save to Database
            await this.prisma.assessmentReport.create({
                data: {
                    assessmentId,
                    reportType: 'ENHANCED' as any,
                    v2Content: reportContent as any,
                } as any,
            });

            await this.prisma.assessment.update({
                where: { id: assessmentId },
                data: {
                    v2ReportGenerated: true,
                    v2ReportGeneratedAt: new Date(),
                } as any,
            });

            return reportContent;
        } catch (error) {
            this.logger.error('Failed to generate V2 report via OpenAI:', error);
            if (error.response) {
                this.logger.error(`OpenAI API Status: ${error.response.status}`);
                this.logger.error(`OpenAI API Data: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }

    /**
     * Generate V2 PDF Report
     */
    async generateV2ReportPDF(assessmentId: string): Promise<{ pdfBuffer: Buffer }> {
        // 1. Get or generate JSON content
        const reportData = await this.getOrGenerateV2Report(assessmentId);

        // 2. Fetch assessment and child for metadata
        const assessment = await this.prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: { child: true },
        });

        if (!assessment) {
            throw new NotFoundException('Assessment not found');
        }

        // 3. Generate Chart Image (raw PNG buffer)
        const chartBuffer = await this.generateDomainChart(reportData.domainDeepDives || []);

        // 4. Generate PDF using PDFKit
        const pdfBuffer = await renderV2Report(reportData, assessment.child, chartBuffer, {
            calculateAge: (dob) => this.calculateAge(dob),
        });

        return { pdfBuffer };
    }

    private async generateDomainChart(domainDeepDives: any[]): Promise<Buffer> {
        if (!domainDeepDives || domainDeepDives.length === 0) {
            // Return a 1x1 transparent PNG if no data
            return Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                'base64',
            );
        }

        const labels = domainDeepDives.map(d => d.domainName || 'Unknown');
        const scores = domainDeepDives.map(d => d.scorePercent || 0);

        const statusToZone = (status: string) => {
            const s = (status || '').toLowerCase();
            if (s.includes('on track') || s === 'green') return 'Green';
            if (s.includes('monitor') || s === 'yellow') return 'Yellow';
            return 'Red';
        };

        const colors = domainDeepDives.map(d => {
            const zone = statusToZone(d.status);
            if (zone === 'Green') return 'rgba(34, 197, 94, 0.8)';
            if (zone === 'Yellow') return 'rgba(234, 179, 8, 0.8)';
            return 'rgba(239, 68, 68, 0.8)';
        });

        const configuration = {
            type: 'bar' as const,
            data: {
                labels,
                datasets: [{
                    label: 'Development Score (%)',
                    data: scores,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 1,
                }],
            },
            options: {
                indexAxis: 'y' as const,
                responsive: true,
                scales: {
                    x: { beginAtZero: true, max: 100 }
                },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Developmental Profile' }
                }
            }
        };

        return this.getChartCanvas().renderToBuffer(configuration as any);
    }

    private getChartCanvas(): any {
        if (!this.chartJSNodeCanvas) {
            const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
            this.chartJSNodeCanvas = new ChartJSNodeCanvas({
                width: 800,
                height: 400,
                backgroundColour: 'white',
            });
        }
        return this.chartJSNodeCanvas;
    }

    // generateV2ReportHTML removed — replaced by pdf/pdf-report-v2.renderer.ts

    private calculateAge(dateOfBirth: Date): string {
        const now = new Date();
        const dob = new Date(dateOfBirth);
        const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());

        if (months < 12) {
            return `${months} months`;
        } else {
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;
            return remainingMonths > 0 ? `${years} years ${remainingMonths} months` : `${years} years`;
        }
    }

    private calculateZone(score: number): string {
        if (score >= 0.46) return 'Red';
        if (score >= 0.30) return 'Yellow';
        return 'Green';
    }
}
