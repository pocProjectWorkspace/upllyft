import { Injectable } from '@nestjs/common';
// removed direct ChartJSNodeCanvas import
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from './scoring.service';
import { renderV1Report } from './pdf/pdf-report-v1.renderer';
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
  private chartJSNodeCanvas: any;

  constructor(
    private prisma: PrismaService,
    private scoringService: ScoringService,
  ) {
    // Initialize chart canvas lazily when needed
  }

  /**
   * Generate domain scores bar chart
   */
  private async generateDomainChart(domainScores: any): Promise<Buffer> {
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

  // generateReportHTML removed — replaced by pdf/pdf-report-v1.renderer.ts

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

    // Generate chart image (raw PNG buffer)
    const chartBuffer = await this.generateDomainChart(reportData.domainScores);

    // Generate PDF using PDFKit
    const pdfBuffer = await renderV1Report(reportData, chartBuffer, reportType, {
      formatDomainName: (id) => this.formatDomainName(id),
      getInterpretation: (riskIndex, name) => this.scoringService.getInterpretation(riskIndex, name),
      calculateAge: (dob) => this.calculateAge(dob),
    });

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
      pdfBuffer,
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
