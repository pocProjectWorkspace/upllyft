import { PdfBuilder } from './pdf-helpers';

/**
 * Render a V2 Deep Insight PDF report using PDFKit.
 */
export async function renderV2Report(
  report: any,
  child: any,
  chartBuffer: Buffer,
  helpers: {
    calculateAge: (dob: Date) => string;
  },
): Promise<Buffer> {
  const pdf = new PdfBuilder();

  const domainDeepDives: any[] = report.domainDeepDives || [];
  const roadmap = report.strategicRoadmap || {};
  const correlations: any[] = report.clinicalCorrelations || [];
  const narrative = report.developmentalNarrative || {};

  // ── Header ──────────────────────────────────────────────────────────
  pdf.reportHeader(
    report.reportTitle || 'Milestone Map Report',
    'UFMF v2.0 Deep Insight Report',
    report.generatedAt
      ? `Generated ${new Date(report.generatedAt).toLocaleDateString()}`
      : '',
  );

  // ── Profile Grid ────────────────────────────────────────────────────
  pdf.infoGrid('Child Profile', [
    { label: 'Child Name', value: child.firstName || child.name || '' },
    { label: 'Age', value: helpers.calculateAge(child.dateOfBirth) },
    { label: 'Assessment', value: `#${(child.id || '').substring(0, 8)}` },
  ]);

  // ── Executive Summary ───────────────────────────────────────────────
  if (report.executiveSummary) {
    pdf.sectionTitle('Executive Summary');
    pdf.coloredBox(report.executiveSummary);
  }

  // ── Developmental Narrative ─────────────────────────────────────────
  if (
    narrative.biologicalFoundation ||
    narrative.environmentalInterface ||
    narrative.strengthsProfile
  ) {
    pdf.sectionTitle('Developmental Narrative');

    const parts: string[] = [];
    if (narrative.biologicalFoundation) {
      parts.push(`Biological Foundation: ${narrative.biologicalFoundation}`);
    }
    if (narrative.environmentalInterface) {
      parts.push(`Environmental Interface: ${narrative.environmentalInterface}`);
    }
    if (narrative.strengthsProfile) {
      parts.push(`Strengths Profile: ${narrative.strengthsProfile}`);
    }
    pdf.coloredBox(parts.join('\n\n'));
  }

  // ── Chart ───────────────────────────────────────────────────────────
  pdf.chartImage(chartBuffer);

  // ── Domain Deep Dives ───────────────────────────────────────────────
  if (domainDeepDives.length > 0) {
    pdf.sectionTitle('Domain Deep Dives');

    for (const d of domainDeepDives) {
      pdf.v2DomainCard(
        d.domainName || '',
        d.status || '',
        d.scorePercent || 0,
        d.clinicalAnalysis || '',
        d.impactOnDailyLife,
        d.trajectory,
      );
    }
  }

  // ── Clinical Correlations ───────────────────────────────────────────
  if (correlations.length > 0) {
    pdf.doc.addPage();
    pdf.sectionTitle('Clinical Correlations');

    for (const c of correlations) {
      pdf.correlationCard(
        c.observation || '',
        c.relatedHistory || '',
        c.insight || '',
        c.confidence || 'N/A',
      );
    }
  }

  // ── Strategic Roadmap ───────────────────────────────────────────────
  pdf.sectionTitle('Strategic Roadmap');

  const immediatePriorities: any[] = roadmap.immediatePriorities || [];
  if (immediatePriorities.length > 0) {
    pdf.heading3('Immediate Priorities');
    pdf.arrowList(
      immediatePriorities.map(
        (p: any) => `${p.area}: ${p.action} \u2014 ${p.reason}`,
      ),
    );
    pdf.moveDown(0.5);
  }

  const envMods: string[] = roadmap.environmentalModifications || [];
  if (envMods.length > 0) {
    pdf.heading3('Environmental Modifications');
    pdf.arrowList(envMods);
    pdf.moveDown(0.5);
  }

  const longTermGoals: string[] = roadmap.longTermGoals || [];
  if (longTermGoals.length > 0) {
    pdf.heading3('Long-Term Goals');
    pdf.arrowList(longTermGoals);
    pdf.moveDown(0.5);
  }

  // ── Professional Questions ──────────────────────────────────────────
  const questions: string[] = report.professionalQuestions || [];
  if (questions.length > 0) {
    pdf.sectionTitle('Questions for Your Professional');
    pdf.arrowList(questions);
  }

  // ── Disclaimers Footer ──────────────────────────────────────────────
  const disclaimers: string[] = report.disclaimers || [];
  const footerLines = [...disclaimers, 'Upllyft Framework \u00A9 2026'];
  pdf.footer(footerLines);

  return pdf.toBuffer();
}
