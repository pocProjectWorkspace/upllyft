import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as puppeteer from 'puppeteer';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import * as fs from 'fs';
import * as path from 'path';
import { ACTIVITY_PLAYBOOK } from './activity-playbook';

@Injectable()
export class ReportGeneratorV2Service {
    private readonly logger = new Logger(ReportGeneratorV2Service.name);
    private openai: OpenAI;
    private chartJSNodeCanvas: ChartJSNodeCanvas;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        this.openai = new OpenAI({
            apiKey,
            timeout: 180000 // 180 seconds timeout for long synthesis
        });

        // Initialize chart canvas (800x400)
        this.chartJSNodeCanvas = new ChartJSNodeCanvas({
            width: 800,
            height: 400,
            backgroundColour: 'white',
        });
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
        const existingReport = await this.prisma.assessmentReport.findFirst({
            where: { assessmentId, reportType: 'ENHANCED' as any },
        });

        const reportData = (existingReport && (existingReport as any).v2Content)
            ? (existingReport as any).v2Content
            : await this.generateV2Report(assessmentId);

        // 2. Fetch assessment and child for metadata
        const assessment = await this.prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: { child: true },
        });

        if (!assessment) {
            throw new NotFoundException('Assessment not found');
        }

        // 3. Generate Chart Image
        const chartImage = await this.generateDomainChart(reportData.interpretations.domainInterpretations);

        // 4. Generate HTML
        const html = await this.generateV2ReportHTML(reportData, assessment.child, chartImage);

        // 5. Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px',
                },
            });

            return { pdfBuffer: Buffer.from(pdfBuffer) };
        } finally {
            await browser.close();
        }
    }

    /**
     * Generate V2 PDF Report with pre-transformed data
     */
    async generateV2ReportPDFWithData(assessmentId: string, transformedData: any): Promise<{ pdfBuffer: Buffer }> {
        try {
            this.logger.log(`🎨 Starting PDF generation for assessment ${assessmentId}`);

            // 1. Fetch assessment and child for metadata
            this.logger.debug(`Fetching assessment and child data...`);
            const assessment = await this.prisma.assessment.findUnique({
                where: { id: assessmentId },
                include: { child: true },
            });

            if (!assessment) {
                this.logger.error(`Assessment ${assessmentId} not found`);
                throw new NotFoundException('Assessment not found');
            }
            this.logger.debug(`✅ Assessment and child data fetched`);

            // 2. Generate Chart Image
            this.logger.debug(`Generating domain chart...`);
            this.logger.debug(`Domain interpretations count: ${transformedData.interpretations?.domainInterpretations?.length || 0}`);

            let chartImage: string;
            try {
                chartImage = await this.generateDomainChart(transformedData.interpretations.domainInterpretations);
                this.logger.debug(`✅ Chart generated successfully`);
            } catch (chartError) {
                this.logger.error(`❌ Chart generation failed:`, chartError.message);
                throw new Error(`Chart generation failed: ${chartError.message}`);
            }

            // 3. Generate HTML
            this.logger.debug(`Generating HTML...`);
            let html: string;
            try {
                html = await this.generateV2ReportHTML(transformedData, assessment.child, chartImage);
                this.logger.debug(`✅ HTML generated successfully (length: ${html.length})`);
            } catch (htmlError) {
                this.logger.error(`❌ HTML generation failed:`, htmlError.message);
                throw new Error(`HTML generation failed: ${htmlError.message}`);
            }

            // 4. Generate PDF using Puppeteer
            this.logger.debug(`Launching Puppeteer...`);
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });

            try {
                this.logger.debug(`Creating new page...`);
                const page = await browser.newPage();

                this.logger.debug(`Setting HTML content...`);
                await page.setContent(html, { waitUntil: 'networkidle2' });

                this.logger.debug(`Generating PDF...`);
                const pdfBuffer = await page.pdf({
                    format: 'A4',
                    printBackground: true,
                    margin: {
                        top: '20px',
                        right: '20px',
                        bottom: '20px',
                        left: '20px',
                    },
                });

                this.logger.log(`✅ PDF generated successfully (size: ${pdfBuffer.length} bytes)`);
                return { pdfBuffer: Buffer.from(pdfBuffer) };
            } catch (pdfError) {
                this.logger.error(`❌ PDF generation with Puppeteer failed:`, pdfError.message);
                throw new Error(`PDF generation failed: ${pdfError.message}`);
            } finally {
                await browser.close();
                this.logger.debug(`Browser closed`);
            }
        } catch (error) {
            this.logger.error(`❌ generateV2ReportPDFWithData failed:`, error.message);
            this.logger.error(`Stack:`, error.stack);
            throw error;
        }
    }

    private async generateDomainChart(domainInterpretations: any[]): Promise<string> {
        const labels = domainInterpretations.map(d => d.domain);
        const scores = domainInterpretations.map(d => d.developmentScore);

        const colors = domainInterpretations.map(d => {
            if (d.zone === 'Green') return 'rgba(34, 197, 94, 0.8)';
            if (d.zone === 'Yellow') return 'rgba(234, 179, 8, 0.8)';
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

        const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration as any);
        return `data:image/png;base64,${imageBuffer.toString('base64')}`;
    }

    private async generateV2ReportHTML(report: any, child: any, chartImage: string): Promise<string> {
        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                    <style>
        :root {
            --primary: #2563eb;
            --success: #16a34a;
            --warning: #ca8a04;
            --danger: #dc2626;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --bg-light: #f8fafc;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            color: var(--text-main);
            line-height: 1.6;
            padding: 40px;
            background: #fff;
        }
        .header {
            border-bottom: 2px solid var(--bg-light);
            padding-bottom: 24px;
            margin-bottom: 32px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .header-left h1 { font-size: 24px; font-weight: 700; color: var(--primary); margin-bottom: 4px; }
        .header-left p { color: var(--text-muted); font-size: 14px; }
        .confidence-badge {
            background: var(--bg-light);
            padding: 8px 16px;
            border-radius: 99px;
            font-size: 12px;
            font-weight: 600;
            color: var(--primary);
            border: 1px solid #e2e8f0;
        }
        .profile-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            margin-bottom: 40px;
            background: var(--bg-light);
            padding: 24px;
            border-radius: 12px;
        }
        .profile-item label { display: block; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .profile-item span { font-size: 15px; font-weight: 600; }
        
        .section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .section-title::before { content: ''; width: 4px; height: 18px; background: var(--primary); border-radius: 2px; }
        
        .synthesis-card {
            background: #eff6ff;
            border: 1px solid #dbeafe;
            padding: 24px;
            border-radius: 12px;
            margin-bottom: 40px;
        }
        .synthesis-card p { font-size: 15px; }

        .chart-section { text-align: center; margin-bottom: 40px; }
        .chart-section img { max-width: 100%; border-radius: 12px; }

        .domain-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
        .domain-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            page-break-inside: avoid;
        }
        .domain-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .domain-name { font-weight: 700; font-size: 17px; }
        .zone-pill {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .zone-Green { background: #dcfce7; color: #166534; }
        .zone-Yellow { background: #fef9c3; color: #854d0e; }
        .zone-Red { background: #fee2e2; color: #991b1b; }

        .recommendation-list { list-style: none; margin-top: 16px; }
        .recommendation-item {
            position: relative;
            padding-left: 24px;
            font-size: 14px;
            margin-bottom: 8px;
            color: var(--text-main);
        }
        .recommendation-item::before {
            content: '→';
            position: absolute;
            left: 0;
            color: var(--primary);
            font-weight: bold;
        }

        .pathway-section {
            background: #fafafa;
            border-top: 2px solid var(--bg-light);
            margin-top: 40px;
            padding-top: 32px;
            page-break-before: always;
        }
        .footer {
            margin-top: 60px;
            font-size: 11px;
            color: var(--text-muted);
            text-align: center;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
</style>
    </head>
    < body >
    <div class="header" >
        <div class="header-left" >
            <h1>Enhanced Developmental Screening Report </h1>
                < p > Case - Aware Synthesis • Unified Framework V2 </p>
                    </div>
                    < div class="confidence-badge" > Confidence Level: ${report.interpretations.overallSynthesis.confidenceLevel} </div>
                        </div>

                        < div class="profile-grid" >
                            <div class="profile-item" > <label>Child Name < /label><span>${child.firstName}</span > </div>
                                < div class="profile-item" > <label>Age < /label><span>${this.calculateAge(child.dateOfBirth)}</span > </div>
                                    < div class="profile-item" > <label>Assessment ID < /label><span>#${child.id.substring(0, 8)}</span > </div>
                                        </div>

                                        < div class="section-title" > Clinical Synthesis </div>
                                            < div class="synthesis-card" >
                                                <p>${report.interpretations.overallSynthesis.summary} </p>
                                                    </div>

                                                    < div class="chart-section" >
                                                        <img src="${chartImage}" />
                                                            </div>

                                                            < div class="section-title" > Domain Analysis </div>
                                                                < div class="domain-grid" >
                                                                    ${report.interpretations.domainInterpretations.map(d => `
            <div class="domain-card">
                <div class="domain-header">
                    <span class="domain-name">${d.domain}</span>
                    <span class="zone-pill zone-${d.zone}">${d.zone === 'Green' ? 'On Track' : d.zone === 'Yellow' ? 'Monitor' : 'Support Recommended'}</span>
                </div>
                <p style="font-size: 14px; margin-bottom: 12px;">${d.interpretation}</p>
                <div style="font-weight: 600; font-size: 13px; color: var(--text-muted);">Activities & Guidance:</div>
                <ul class="recommendation-list">
                    ${d.recommendations.map(r => `<li class="recommendation-item">${r}</li>`).join('')}
                </ul>
            </div>
        `).join('')
            }
</div>

    < div class="pathway-section" >
        <div class="section-title" > Support Pathways </div>
            < p style = "font-size: 15px; margin-bottom: 16px;" > <strong>Strategic Approach: </strong> ${report.supportPathways.strategy}</p >
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;" > Recommended Next Steps: </div>
                    < ul class="recommendation-list" >
                        ${report.supportPathways.steps.map(s => `<li class="recommendation-item">${s}</li>`).join('')}
</ul>
    < div style = "margin-top: 24px; padding: 16px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; font-size: 13px;" >
        <strong>Professional Guidance: </strong> ${report.supportPathways.professionalGuidance}
            </div>
            </div>

            < div class="footer" >
                This report is a screening guidance tool generated with AI assistance based on parent - reported data and screening questionnaires. 
        It is NOT a medical diagnosis and should be discussed with a qualified professional.
        Upllyft Framework © 2026
    </div>
    </body>
    </html>
        `;
    }

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
