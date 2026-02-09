import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from './scoring.service';
import * as fs from 'fs';
import * as path from 'path';

export interface ReportData {
  assessment: any;
  child: any;
  domainScores: any;
  responses: any[];
  questionnaire: any;
  overallScore: number;
  recommendations: string[];
}

@Injectable()
export class ReportGeneratorService {
  private chartJSNodeCanvas: ChartJSNodeCanvas;

  constructor(
    private prisma: PrismaService,
    private scoringService: ScoringService,
  ) {
    // Initialize chart canvas (800x400)
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white',
    });
  }

  /**
   * Generate domain scores bar chart
   */
  private async generateDomainChart(domainScores: any): Promise<string> {
    const domains = Object.keys(domainScores);
    const scores = domains.map((d) => domainScores[d].riskIndex);
    const colors = domains.map((d) => {
      const status = domainScores[d].status;
      if (status === 'GREEN') return 'rgba(34, 197, 94, 0.8)';
      if (status === 'YELLOW') return 'rgba(234, 179, 8, 0.8)';
      return 'rgba(239, 68, 68, 0.8)';
    });

    const configuration = {
      type: 'bar' as const,
      data: {
        labels: domains.map((d) => this.formatDomainName(d)),
        datasets: [
          {
            label: 'Risk Index',
            data: scores,
            backgroundColor: colors,
            borderColor: colors.map((c) => c.replace('0.8', '1')),
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: 'Domain Risk Assessment',
            font: {
              size: 18,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 1.0,
            title: {
              display: true,
              text: 'Risk Index (0 = On Track, 1 = Needs Attention)',
            },
          },
        },
      },
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(
      configuration as any,
    );
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
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

  /**
   * Generate HTML for PDF report
   */
  private async generateReportHTML(
    reportData: ReportData,
    reportType: 'SUMMARY' | 'DETAILED',
  ): Promise<string> {
    const chartImage = await this.generateDomainChart(reportData.domainScores);
    const { assessment, child, domainScores, responses, questionnaire, overallScore, recommendations } = reportData;

    // Calculate age from date of birth
    const age = this.calculateAge(child.dateOfBirth);

    // Determine overall status
    let overallStatus = 'GREEN';
    if (overallScore >= 0.46) overallStatus = 'RED';
    else if (overallScore >= 0.30) overallStatus = 'YELLOW';

    const statusColor = overallStatus === 'GREEN' ? '#22c55e' : overallStatus === 'YELLOW' ? '#eab308' : '#ef4444';

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      padding: 40px;
      background: white;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #1e40af;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .header p {
      color: #6b7280;
      font-size: 14px;
    }
    .child-info {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .child-info h2 {
      color: #1f2937;
      font-size: 20px;
      margin-bottom: 15px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 16px;
      color: #1f2937;
      font-weight: 600;
    }
    .overall-score {
      background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
      color: white;
      padding: 25px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    .overall-score h3 {
      font-size: 18px;
      margin-bottom: 10px;
      opacity: 0.9;
    }
    .score-value {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      background: white;
      color: ${statusColor};
    }
    .chart-container {
      margin: 30px 0;
      text-align: center;
    }
    .chart-container img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .domain-section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .domain-header {
      background: #f9fafb;
      padding: 15px 20px;
      border-left: 4px solid #3b82f6;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .domain-name {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }
    .domain-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-green {
      background: #d1fae5;
      color: #065f46;
    }
    .status-yellow {
      background: #fef3c7;
      color: #92400e;
    }
    .status-red {
      background: #fee2e2;
      color: #991b1b;
    }
    .domain-content {
      padding: 0 20px;
    }
    .domain-score {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 10px;
    }
    .interpretation {
      background: #eff6ff;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 15px;
      font-size: 14px;
      line-height: 1.8;
    }
    .questions-list {
      margin-top: 15px;
    }
    .question-item {
      background: white;
      border: 1px solid #e5e7eb;
      padding: 12px 15px;
      margin-bottom: 10px;
      border-radius: 6px;
    }
    .question-text {
      font-size: 14px;
      color: #374151;
      margin-bottom: 6px;
    }
    .question-answer {
      font-size: 13px;
      color: #6b7280;
    }
    .answer-value {
      font-weight: 600;
      color: #1f2937;
    }
    .recommendations {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 30px 0;
      border-radius: 6px;
    }
    .recommendations h3 {
      color: #92400e;
      font-size: 18px;
      margin-bottom: 15px;
    }
    .recommendations ul {
      list-style: none;
      padding: 0;
    }
    .recommendations li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
      color: #78350f;
      font-size: 14px;
      line-height: 1.6;
    }
    .recommendations li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #f59e0b;
      font-weight: bold;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .disclaimer {
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      font-size: 13px;
      color: #991b1b;
      line-height: 1.6;
    }
    .framework-description {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      font-size: 12px;
      color: #1e3a5f;
      line-height: 1.7;
    }
    .framework-description h3 {
      font-size: 14px;
      font-weight: bold;
      color: #0c4a6e;
      margin-bottom: 12px;
    }
    .framework-description p {
      margin-bottom: 10px;
    }
    .framework-description p:last-child {
      margin-bottom: 0;
    }
    @media print {
      body {
        padding: 20px;
      }
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Developmental Assessment Report</h1>
    <p>Upllyft Fusion Milestones Framework (UFMF v2.0)</p>
    <p>Generated on ${new Date(assessment.completedAt || assessment.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="child-info">
    <h2>Child Information</h2>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Child Name</span>
        <span class="info-value">${child.firstName}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Age</span>
        <span class="info-value">${age}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Assessment Date</span>
        <span class="info-value">${new Date(assessment.completedAt || assessment.createdAt).toLocaleDateString()}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Age Group</span>
        <span class="info-value">${questionnaire.displayName}</span>
      </div>
    </div>
  </div>

  <div class="overall-score">
    <h3>Overall Assessment Score</h3>
    <div class="score-value">${(overallScore * 100).toFixed(0)}%</div>
    <div class="status-badge">${overallStatus === 'GREEN' ? 'On Track' : overallStatus === 'YELLOW' ? 'Monitor' : 'Needs Attention'}</div>
  </div>

  <div class="chart-container">
    <img src="${chartImage}" alt="Domain Scores Chart" />
  </div>

  <div class="disclaimer">
    <strong>Important Note:</strong> This is a screening tool, not a diagnostic assessment. Children develop at different rates. This report highlights patterns and areas that may benefit from extra support. Please consult with a healthcare professional for a comprehensive evaluation.
  </div>

  <div class="framework-description">
    <h3>About This Framework — UFMF v2.0</h3>
    <p>Upllyft Fusion Milestones Framework (UFMF v2.0) is a multi-domain developmental screening and functional formulation framework designed to identify strengths, emerging risks, and support needs across the full spectrum of neurodivergence. It organizes caregiver- and self-reported observations into recognized neurodevelopmental domains (including motor, language, cognition, social-emotional, adaptive functioning, sensory processing, and vision/hearing) and evaluates these against age-anchored developmental expectations. The framework is intended to support early identification, monitoring, and care-planning discussions, and does not provide medical or psychological diagnoses.</p>
    <p>UFMF v2.0 is explicitly aligned with international diagnostic and functioning standards. Diagnostic classification remains the responsibility of qualified clinicians using established systems such as ICD-11 (World Health Organization) and DSM-5-TR (American Psychiatric Association). UFMF v2.0 does not assign diagnostic labels; instead, it structures screening findings so clinicians can determine whether formal diagnostic evaluation is indicated and which areas require further assessment. Functional interpretation within the framework is consistent with the International Classification of Functioning, Disability and Health (ICF), emphasizing how observed patterns affect daily activities, participation, and contextual support needs rather than focusing solely on symptom presence.</p>
    <p>The framework integrates three complementary layers: (1) developmental milestone and skill mapping across domains; (2) synthesis of functional impact on everyday life, learning, and independence; and (3) non-diagnostic clinical hypothesis links ("clinical connections") that explain how observed patterns may relate to known neurodevelopmental mechanisms (e.g., executive function demands, regulation, sensory processing). These clinical connections are intended to guide referral decisions, differential assessment, and intervention planning, and should not be interpreted as diagnostic conclusions.</p>
    <p>All UFMF v2.0 outputs are provided as clinical decision-support and require professional judgment. Results are expressed using screening-appropriate language (e.g., "On Track," "Monitor," "Evaluate") and include confidence indicators to support responsible interpretation. The framework is designed to enhance transparency, interdisciplinary communication, and early support planning while maintaining clear boundaries between screening, diagnosis, and treatment.</p>
  </div>
`;

    // Add domain breakdowns
    const domains = Object.keys(domainScores);
    for (const domainId of domains) {
      const domainData = domainScores[domainId];
      const domainName = this.formatDomainName(domainId);
      const statusClass = `status-${domainData.status.toLowerCase()}`;
      const statusText = domainData.status === 'GREEN' ? 'On Track' : domainData.status === 'YELLOW' ? 'Monitor' : 'Needs Attention';

      html += `
  <div class="domain-section">
    <div class="domain-header">
      <span class="domain-name">${domainName}</span>
      <span class="domain-status ${statusClass}">${statusText}</span>
    </div>
    <div class="domain-content">
      <div class="domain-score">
        Risk Index: ${(domainData.riskIndex * 100).toFixed(0)}%
      </div>
      <div class="interpretation">
        ${this.scoringService.getInterpretation(domainData.riskIndex, domainName)}
      </div>
`;

      // Add detailed questions if DETAILED report
      if (reportType === 'DETAILED') {
        const domainResponses = responses.filter((r) => r.domain === domainId);
        if (domainResponses.length > 0) {
          html += `
      <div class="questions-list">
        <h4 style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Questions & Responses</h4>
`;
          for (const response of domainResponses) {
            // Find question text from questionnaire
            const domain = questionnaire.domains.find((d: any) => d.id === domainId);
            const allQuestions = [...(domain?.tier1 || []), ...(domain?.tier2 || [])];
            const question = allQuestions.find((q: any) => q.id === response.questionId);

            if (question) {
              html += `
        <div class="question-item">
          <div class="question-text">${question.question}</div>
          <div class="question-answer">
            Answer: <span class="answer-value">${response.answer.replace('_', ' ')}</span>
            ${question.whyWeAsk ? `<br><em style="font-size: 12px; color: #9ca3af;">Why we ask: ${question.whyWeAsk}</em>` : ''}
          </div>
        </div>
`;
            }
          }
          html += `
      </div>
`;
        }
      }

      html += `
    </div>
  </div>
`;
    }

    // Add recommendations
    html += `
  <div class="recommendations">
    <h3>Recommendations</h3>
    <ul>
`;
    for (const rec of recommendations) {
      html += `      <li>${rec}</li>\n`;
    }
    html += `
    </ul>
  </div>

  <div class="footer">
    <p><strong>Upllyft</strong> - Supporting developmental milestones</p>
    <p>This report was generated using the Upllyft Fusion Milestones Framework (UFMF v2.0)</p>
    <p>For questions or concerns, please consult with your healthcare provider or therapist.</p>
  </div>
</body>
</html>
`;

    return html;
  }

  /**
   * Calculate age from date of birth
   */
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

  /**
   * Generate PDF report
   */
  async generateReport(
    assessmentId: string,
    reportType: 'SUMMARY' | 'DETAILED' = 'SUMMARY',
  ): Promise<{ pdfBuffer: Buffer; reportId: string }> {
    // Fetch assessment with all related data
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        child: true,
        responses: {
          orderBy: { answeredAt: 'asc' },
        },
      },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    if (assessment.status !== 'COMPLETED') {
      throw new Error('Assessment must be completed before generating report');
    }

    // Load questionnaire
    const questionnairePath = path.join(
      __dirname,
      'questionnaires',
      `${assessment.ageGroup}.json`,
    );
    const questionnaireData = fs.readFileSync(questionnairePath, 'utf-8');
    const questionnaire = JSON.parse(questionnaireData);

    // Prepare domain scores array for recommendations
    const domainScoresArray = Object.entries(assessment.domainScores as any).map(
      ([domainId, data]: [string, any]) => ({
        domainId,
        domainName: this.formatDomainName(domainId),
        riskIndex: data.riskIndex,
        status: data.status,
        tier2Required: data.tier2Required,
      }),
    );

    // Get recommendations
    const recommendations = this.scoringService.getRecommendations(domainScoresArray);

    const reportData: ReportData = {
      assessment,
      child: assessment.child,
      domainScores: assessment.domainScores,
      responses: assessment.responses,
      questionnaire,
      overallScore: assessment.overallScore || 0,
      recommendations,
    };

    // Generate HTML
    const html = await this.generateReportHTML(reportData, reportType);

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

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

    await browser.close();

    // Save report record
    const report = await this.prisma.assessmentReport.create({
      data: {
        assessmentId,
        reportType,
        // pdfUrl will be set after uploading to cloud storage
      },
    });

    // Update assessment
    await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        reportGenerated: true,
        reportGeneratedAt: new Date(),
      },
    });

    return {
      pdfBuffer: Buffer.from(pdfBuffer),
      reportId: report.id,
    };
  }

  /**
   * Get existing report
   */
  async getReport(reportId: string): Promise<any> {
    return this.prisma.assessmentReport.findUnique({
      where: { id: reportId },
      include: {
        assessment: {
          include: {
            child: true,
          },
        },
      },
    });
  }

  /**
   * Track report download
   */
  async trackDownload(reportId: string): Promise<void> {
    await this.prisma.assessmentReport.update({
      where: { id: reportId },
      data: {
        downloadCount: {
          increment: 1,
        },
        lastDownloadedAt: new Date(),
      },
    });
  }
}
