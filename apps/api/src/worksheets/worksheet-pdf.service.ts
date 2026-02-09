import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { ACTIVITY_SUB_TYPES } from './constants/activity-types';
import { DEVELOPMENTAL_DOMAINS } from './constants/domains';
import type {
  AnyWorksheetContent,
  WorksheetContent,
  VisualScheduleContent,
  SocialStoryContent,
  EmotionThermometerContent,
  WeeklyPlanContent,
  DailyRoutineContent,
} from './worksheet-ai.service';

interface PdfRenderData {
  title: string;
  worksheetType: string;
  subType: string;
  difficulty: string;
  duration: string;
  setting: string;
  targetDomains: string[];
  content: AnyWorksheetContent;
  images: Map<string, { imageUrl: string; altText: string }>;
}

// Template + CSS file mapping by type/subType
const TEMPLATE_MAP: Record<string, { html: string; css: string }> = {
  'ACTIVITY': { html: 'activity-worksheet.html', css: 'styles.css' },
  'VISUAL_SUPPORT/visual_schedule': { html: 'visual-schedule.html', css: 'styles-visual-support.css' },
  'VISUAL_SUPPORT/social_story': { html: 'social-story.html', css: 'styles-visual-support.css' },
  'VISUAL_SUPPORT/emotion_thermometer': { html: 'emotion-thermometer.html', css: 'styles-visual-support.css' },
  'STRUCTURED_PLAN/weekly_plan': { html: 'weekly-plan.html', css: 'styles-structured-plan.css' },
  'STRUCTURED_PLAN/daily_routine': { html: 'daily-routine.html', css: 'styles-structured-plan.css' },
};

@Injectable()
export class WorksheetPdfService {
  private readonly logger = new Logger(WorksheetPdfService.name);
  private _supabase: SupabaseClient | null = null;
  private readonly bucketName = 'worksheet-pdfs';
  private readonly templatesDir: string;
  private readonly templateCache = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {
    this.templatesDir = path.join(__dirname, 'templates');
  }

  private get supabase(): SupabaseClient {
    if (!this._supabase) {
      const url = this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL', '');
      const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY', '');
      if (!url || !key) {
        throw new Error(
          'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
        );
      }
      this._supabase = createClient(url, key);
    }
    return this._supabase;
  }

  private loadTemplate(fileName: string): string {
    const cached = this.templateCache.get(fileName);
    if (cached) return cached;

    const content = fs.readFileSync(
      path.join(this.templatesDir, fileName),
      'utf-8',
    );
    this.templateCache.set(fileName, content);
    return content;
  }

  private getTemplateFiles(worksheetType: string, subType: string): { html: string; css: string } {
    const key = `${worksheetType}/${subType}`;
    return TEMPLATE_MAP[key] ?? TEMPLATE_MAP[worksheetType] ?? TEMPLATE_MAP['ACTIVITY'];
  }

  async generatePdf(data: PdfRenderData): Promise<{ pdfUrl: string; previewUrl: string }> {
    this.logger.log(`Generating PDF for worksheet: "${data.title}" (${data.worksheetType}/${data.subType})`);

    const html = this.buildHtml(data);

    let browser: puppeteer.Browser | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '18mm',
          right: '14mm',
          bottom: '18mm',
          left: '14mm',
        },
      });

      await page.setViewport({ width: 794, height: 1123 });
      const screenshotBuffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 794, height: 1123 },
      });

      await browser.close();
      browser = null;

      const pdfUrl = await this.uploadToSupabase(
        Buffer.from(pdfBuffer),
        `${uuid()}.pdf`,
        'application/pdf',
      );

      const previewUrl = await this.uploadPreview(
        Buffer.from(screenshotBuffer),
        `${uuid()}-preview.png`,
      );

      this.logger.log(`PDF generated and uploaded: ${pdfUrl}`);

      return { pdfUrl, previewUrl };
    } catch (error) {
      this.logger.error(`PDF generation failed: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private buildHtml(data: PdfRenderData): string {
    const { html: htmlFile, css: cssFile } = this.getTemplateFiles(data.worksheetType, data.subType);
    let html = this.loadTemplate(htmlFile);
    const css = this.loadTemplate(cssFile);

    // Inject CSS
    html = html.replace('{{styles}}', css);

    // Route to type-specific builder
    switch (data.worksheetType) {
      case 'VISUAL_SUPPORT':
        return this.buildVisualSupportHtml(html, data);
      case 'STRUCTURED_PLAN':
        return this.buildStructuredPlanHtml(html, data);
      case 'ACTIVITY':
      default:
        return this.buildActivityHtml(html, data);
    }
  }

  // ─── Activity Worksheet (Phase 1) ──────────────────────────

  private buildActivityHtml(html: string, data: PdfRenderData): string {
    const content = data.content as WorksheetContent;
    const subTypeInfo = ACTIVITY_SUB_TYPES[data.subType as keyof typeof ACTIVITY_SUB_TYPES];
    const subTypeLabel = subTypeInfo?.label ?? data.subType;

    const difficultyLabel = this.getDifficultyLabel(data.difficulty);
    const durationLabel = this.getDurationLabel(data.duration);
    const domainTags = this.getDomainTags(data.targetDomains);
    const date = this.formatDate();

    // Build sections HTML
    const sectionsHtml = content.sections
      .map((section, sIdx) => {
        const activitiesHtml = section.activities
          .map((activity) => {
            const imageData = data.images.get(activity.id);
            const imageHtml = imageData?.imageUrl
              ? `<div class="activity-image"><img src="${imageData.imageUrl}" alt="${imageData.altText}" /></div>`
              : `<div class="activity-image-placeholder">Illustration</div>`;

            return `
            <div class="activity-card">
              ${imageHtml}
              <div class="activity-content">
                <div class="activity-name">${this.escapeHtml(activity.name)}</div>
                <div class="activity-instructions">${this.escapeHtml(activity.instructions)}</div>
                <div class="activity-materials">
                  <strong>Materials:</strong> ${this.escapeHtml(activity.materials.join(', '))}
                </div>
                <div class="activity-rationale">${this.escapeHtml(activity.therapeuticRationale)}</div>
                <div class="adaptations">
                  <div class="adaptation adaptation-easier">
                    <span class="adaptation-label">Make it easier:</span>
                    ${this.escapeHtml(activity.adaptations.easier)}
                  </div>
                  <div class="adaptation adaptation-harder">
                    <span class="adaptation-label">Challenge up:</span>
                    ${this.escapeHtml(activity.adaptations.harder)}
                  </div>
                </div>
              </div>
            </div>`;
          })
          .join('\n');

        return `
        <div class="section">
          <div class="section-header">
            <div class="section-number">${sIdx + 1}</div>
            <div class="section-title">${this.escapeHtml(section.title)}</div>
          </div>
          ${section.description ? `<div class="section-description">${this.escapeHtml(section.description)}</div>` : ''}
          ${activitiesHtml}
        </div>`;
      })
      .join('\n');

    const tipsHtml = this.buildTipsHtml(content.tips);
    const notesHtml = this.buildNotesHtml(content.notesPrompt);

    html = html.replace(/\{\{title\}\}/g, this.escapeHtml(data.title));
    html = html.replace('{{subTypeLabel}}', this.escapeHtml(subTypeLabel));
    html = html.replace('{{difficultyLabel}}', difficultyLabel);
    html = html.replace('{{date}}', date);
    html = html.replace('{{duration}}', durationLabel);
    html = html.replace('{{setting}}', data.setting);
    html = html.replace('{{instructions}}', this.escapeHtml(content.instructions));
    html = html.replace('{{notesPrompt}}', this.escapeHtml(content.notesPrompt || ''));

    html = html.replace(
      /\{\{#each domainTags\}\}[\s\S]*?\{\{\/each\}\}/,
      domainTags.map((t) => `<span class="meta-tag">${this.escapeHtml(t)}</span>`).join(''),
    );

    html = html.replace(
      /\{\{#each sections\}\}[\s\S]*?\{\{\/each\}\}/,
      sectionsHtml,
    );

    html = html.replace(
      /\{\{#if tips\.length\}\}[\s\S]*?\{\{\/if\}\}/,
      tipsHtml,
    );

    html = html.replace(
      /<div class="notes-section">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
      notesHtml,
    );

    return html;
  }

  // ─── Visual Support Worksheets ─────────────────────────────

  private buildVisualSupportHtml(html: string, data: PdfRenderData): string {
    switch (data.subType) {
      case 'visual_schedule':
        return this.buildVisualScheduleHtml(html, data);
      case 'social_story':
        return this.buildSocialStoryHtml(html, data);
      case 'emotion_thermometer':
        return this.buildEmotionThermometerHtml(html, data);
      default:
        return this.buildVisualScheduleHtml(html, data);
    }
  }

  private buildVisualScheduleHtml(html: string, data: PdfRenderData): string {
    const content = data.content as VisualScheduleContent;
    const domainTags = this.getDomainTags(data.targetDomains);
    const date = this.formatDate();

    // Replace simple placeholders
    html = html.replace(/\{\{title\}\}/g, this.escapeHtml(content.title));
    html = html.replace('{{difficultyLabel}}', this.getDifficultyLabel(data.difficulty));
    html = html.replace('{{date}}', date);
    html = html.replace('{{setting}}', data.setting);
    html = html.replace('{{totalDuration}}', this.getDurationLabel(data.duration));
    html = html.replace('{{instructions}}', this.escapeHtml(content.instructions));
    html = html.replace('{{notesPrompt}}', this.escapeHtml(content.notesPrompt || ''));

    // Domain tags
    html = html.replace(
      /\{\{#each domainTags\}\}[\s\S]*?\{\{\/each\}\}/,
      domainTags.map((t) => `<span class="meta-tag">${this.escapeHtml(t)}</span>`).join(''),
    );

    // Steps
    const stepsHtml = content.steps
      .map((step, idx) => {
        const imageData = data.images.get(step.id);
        const isLast = idx === content.steps.length - 1;
        const iconEmoji = step.visualCue || '📋';

        const iconHtml = imageData?.imageUrl
          ? `<img src="${imageData.imageUrl}" alt="${imageData.altText}" class="step-icon-img" />`
          : `<div class="step-icon-placeholder"><span class="icon-symbol">${iconEmoji}</span></div>`;

        const supportTipHtml = step.supportTip
          ? `<div class="step-support-tip"><span class="support-tip-label">Support Tip:</span> ${this.escapeHtml(step.supportTip)}</div>`
          : '';

        return `
        <div class="timeline-step">
          <div class="timeline-connector">
            <div class="step-number">${idx + 1}</div>
            ${!isLast ? '<div class="connector-line"></div>' : ''}
          </div>
          <div class="step-card">
            <div class="step-card-header">
              <div class="step-checkbox"><div class="checkbox-box"></div></div>
              <div class="step-icon-area">${iconHtml}</div>
              <div class="step-info">
                <div class="step-label">${this.escapeHtml(step.label)}</div>
                <div class="step-duration"><span class="duration-icon">&#9201;</span> ${this.escapeHtml(step.duration)}</div>
              </div>
            </div>
            <div class="step-description">${this.escapeHtml(step.description)}</div>
            ${supportTipHtml}
          </div>
        </div>`;
      })
      .join('\n');

    html = html.replace(
      /\{\{#each steps\}\}[\s\S]*?\{\{\/each\}\}/,
      stepsHtml,
    );

    // Transition strategies
    const transitionsHtml = content.transitionStrategies?.length
      ? `<div class="transition-section">
          <h2>Transition Strategies</h2>
          <div class="transition-cards">
            ${content.transitionStrategies.map((s) => `<div class="transition-card"><div class="transition-card-desc">${this.escapeHtml(s)}</div></div>`).join('')}
          </div>
        </div>`
      : '';

    html = html.replace(
      /\{\{#if transitionStrategies\.length\}\}[\s\S]*?\{\{\/if\}\}/,
      transitionsHtml,
    );

    // Tips
    html = html.replace(
      /\{\{#if tips\.length\}\}[\s\S]*?\{\{\/if\}\}/,
      this.buildTipsHtml(content.tips),
    );

    return html;
  }

  private buildSocialStoryHtml(html: string, data: PdfRenderData): string {
    const content = data.content as SocialStoryContent;
    const domainTags = this.getDomainTags(data.targetDomains);
    const date = this.formatDate();

    const sentenceTypeLabels: Record<string, string> = {
      descriptive: 'Descriptive',
      perspective: 'Perspective',
      directive: 'Directive',
      affirmative: 'Affirmative',
      cooperative: 'Cooperative',
      control: 'Control',
    };

    html = html.replace(/\{\{title\}\}/g, this.escapeHtml(content.title));
    html = html.replace('{{difficultyLabel}}', this.getDifficultyLabel(data.difficulty));
    html = html.replace('{{date}}', date);
    html = html.replace('{{setting}}', data.setting);
    html = html.replace('{{targetSkill}}', '');
    html = html.replace('{{instructions}}', this.escapeHtml(content.instructions));
    html = html.replace('{{notesPrompt}}', this.escapeHtml(content.notesPrompt || ''));

    html = html.replace(
      /\{\{#each domainTags\}\}[\s\S]*?\{\{\/each\}\}/,
      domainTags.map((t) => `<span class="meta-tag">${this.escapeHtml(t)}</span>`).join(''),
    );

    // Pages
    const pagesHtml = content.pages
      .map((page) => {
        const imageData = data.images.get(page.id);
        const illustrationHtml = imageData?.imageUrl
          ? `<img src="${imageData.imageUrl}" alt="Story illustration" class="story-illustration" />`
          : `<div class="story-illustration-placeholder"><div class="placeholder-label">Illustration</div></div>`;

        const parentNoteHtml = page.parentNote
          ? `<div class="parent-note"><span class="parent-note-label">Note for Parent/Facilitator:</span> ${this.escapeHtml(page.parentNote)}</div>`
          : '';

        const typeLabel = sentenceTypeLabels[page.sentenceType] || page.sentenceType;

        return `
        <div class="story-page">
          <div class="page-number-badge">Page ${page.order}</div>
          <div class="story-illustration-area">${illustrationHtml}</div>
          <div class="story-text-area">
            <div class="sentence-type-indicator sentence-type-${page.sentenceType}">${typeLabel}</div>
            <p class="story-text">${this.escapeHtml(page.text)}</p>
          </div>
          ${parentNoteHtml}
        </div>`;
      })
      .join('\n');

    html = html.replace(
      /\{\{#each pages\}\}[\s\S]*?\{\{\/each\}\}/,
      pagesHtml,
    );

    // Comprehension questions
    const questionsHtml = content.comprehensionQuestions?.length
      ? `<div class="comprehension-section">
          <h2>Let's Think About the Story</h2>
          <div class="questions-list">
            ${content.comprehensionQuestions.map((q, i) => `
              <div class="question-card">
                <div class="question-number">${i + 1}</div>
                <div class="question-content">
                  <div class="question-text">${this.escapeHtml(q.question)}</div>
                  <div class="question-answer-line"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>`
      : '';

    html = html.replace(
      /\{\{#if comprehensionQuestions\.length\}\}[\s\S]*?\{\{\/if\}\}/,
      questionsHtml,
    );

    html = html.replace(
      /\{\{#if tips\.length\}\}[\s\S]*?\{\{\/if\}\}/,
      this.buildTipsHtml(content.tips),
    );

    return html;
  }

  private buildEmotionThermometerHtml(html: string, data: PdfRenderData): string {
    const content = data.content as EmotionThermometerContent;
    const domainTags = this.getDomainTags(data.targetDomains);
    const date = this.formatDate();

    html = html.replace(/\{\{title\}\}/g, this.escapeHtml(content.title));
    html = html.replace('{{difficultyLabel}}', this.getDifficultyLabel(data.difficulty));
    html = html.replace('{{date}}', date);
    html = html.replace('{{setting}}', data.setting);
    html = html.replace('{{instructions}}', this.escapeHtml(content.instructions));
    html = html.replace('{{notesPrompt}}', this.escapeHtml(content.notesPrompt || ''));

    html = html.replace(
      /\{\{#each domainTags\}\}[\s\S]*?\{\{\/each\}\}/,
      domainTags.map((t) => `<span class="meta-tag">${this.escapeHtml(t)}</span>`).join(''),
    );

    // Levels detail rows (rendered alongside the static thermometer bars in template)
    const levelsHtml = content.levels
      .sort((a, b) => b.intensity - a.intensity) // High to low
      .map((level) => {
        const bodyCuesHtml = level.bodyCues
          .map((c) => `<li>${this.escapeHtml(c)}</li>`)
          .join('');

        const emotionWordsHtml = level.emotionWords
          .map((w) => `<span class="emotion-word-tag emotion-word-level-${level.order}">${this.escapeHtml(w)}</span>`)
          .join('');

        const copingHtml = level.copingStrategies
          .map((s) => `<li>${this.escapeHtml(s)}</li>`)
          .join('');

        return `
        <div class="thermo-detail-row thermo-detail-${level.order}">
          <div class="thermo-emotion-name">${this.escapeHtml(level.name)}</div>
          <div class="thermo-detail-grid">
            <div class="thermo-detail-card thermo-body-cues">
              <div class="detail-card-label">My body feels...</div>
              <ul>${bodyCuesHtml}</ul>
            </div>
            <div class="thermo-detail-card thermo-emotion-words">
              <div class="detail-card-label">I might feel...</div>
              <div class="emotion-word-tags">${emotionWordsHtml}</div>
            </div>
            <div class="thermo-detail-card thermo-coping">
              <div class="detail-card-label">I can try...</div>
              <ul>${copingHtml}</ul>
            </div>
          </div>
        </div>`;
      })
      .join('\n');

    html = html.replace(
      /\{\{#each levels\}\}[\s\S]*?\{\{\/each\}\}/,
      levelsHtml,
    );

    // Check-in script
    const checkInHtml = content.checkInScript
      ? `<div class="checkin-section">
          <h2>Check-In Script</h2>
          <div class="checkin-steps">
            <div class="checkin-step">
              <div class="checkin-step-content">
                <div class="checkin-step-say">${this.escapeHtml(content.checkInScript)}</div>
              </div>
            </div>
          </div>
        </div>`
      : '';

    html = html.replace(
      /\{\{#if checkInScript\}\}[\s\S]*?\{\{\/if\}\}/,
      checkInHtml,
    );

    html = html.replace(
      /\{\{#if tips\.length\}\}[\s\S]*?\{\{\/if\}\}/,
      this.buildTipsHtml(content.tips),
    );

    return html;
  }

  // ─── Structured Plan Worksheets ────────────────────────────

  private buildStructuredPlanHtml(html: string, data: PdfRenderData): string {
    switch (data.subType) {
      case 'weekly_plan':
        return this.buildWeeklyPlanHtml(html, data);
      case 'daily_routine':
        return this.buildDailyRoutineHtml(html, data);
      default:
        return this.buildWeeklyPlanHtml(html, data);
    }
  }

  private buildWeeklyPlanHtml(html: string, data: PdfRenderData): string {
    const content = data.content as WeeklyPlanContent;
    const domainTags = this.getDomainTags(data.targetDomains);
    const date = this.formatDate();

    html = html.replace(/\{\{title\}\}/g, this.escapeHtml(content.title));
    html = html.replace('{{difficultyLabel}}', this.getDifficultyLabel(data.difficulty));
    html = html.replace('{{weekOf}}', date);
    html = html.replace('{{setting}}', data.setting);
    html = html.replace('{{instructions}}', this.escapeHtml(content.instructions));
    html = html.replace('{{notesPrompt}}', this.escapeHtml(content.notesPrompt || ''));

    html = html.replace(
      /\{\{#each domainTags\}\}[\s\S]*?\{\{\/each\}\}/,
      domainTags.map((t) => `<span class="meta-tag">${this.escapeHtml(t)}</span>`).join(''),
    );

    // Weekly goal banner
    const goalHtml = content.weeklyGoal
      ? `<div class="weekly-goal-banner">
          <div class="goal-icon">&#9733;</div>
          <div class="goal-content">
            <div class="goal-label">This Week's Goal</div>
            <div class="goal-text">${this.escapeHtml(content.weeklyGoal)}</div>
          </div>
        </div>`
      : '';

    html = html.replace(
      /\{\{#if weeklyGoal\}\}[\s\S]*?\{\{\/if\}\}/,
      goalHtml,
    );

    // Days grid
    const daysHtml = content.days
      .map((day, dayIdx) => {
        const activitiesHtml = day.activities
          .map((act) => {
            const domainTagsHtml = act.domain
              ? `<div class="day-activity-tags"><span class="domain-tag">${this.escapeHtml(act.domain)}</span></div>`
              : '';

            return `
            <div class="day-activity-card">
              <div class="day-activity-checkbox"><div class="checkbox-box"></div></div>
              <div class="day-activity-content">
                <div class="day-activity-name">${this.escapeHtml(act.name)}</div>
                ${act.description ? `<div class="day-activity-desc">${this.escapeHtml(act.description)}</div>` : ''}
                ${domainTagsHtml}
              </div>
            </div>`;
          })
          .join('');

        const themeHtml = day.theme
          ? `<div class="day-theme">${this.escapeHtml(day.theme)}</div>`
          : '';

        return `
        <div class="day-column">
          <div class="day-header day-header-${dayIdx}">
            <div class="day-name">${this.escapeHtml(day.dayName)}</div>
            ${themeHtml}
          </div>
          <div class="day-activities">${activitiesHtml}</div>
        </div>`;
      })
      .join('\n');

    html = html.replace(
      /\{\{#each days\}\}[\s\S]*?\{\{\/each\}\}/,
      daysHtml,
    );

    // Progress tracking
    const progressHtml = content.progressTracking?.dailyCheckboxes?.length
      ? `<div class="progress-section">
          <h2>Weekly Progress Tracker</h2>
          <div class="progress-grid">
            ${content.progressTracking.dailyCheckboxes.map((goal) => `
              <div class="progress-row">
                <div class="progress-goal">${this.escapeHtml(goal)}</div>
                <div class="progress-checkboxes">
                  ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<div class="progress-day-box"><span class="day-abbr">${d}</span><div class="checkbox-box"></div></div>`).join('')}
                </div>
              </div>`).join('')}
          </div>
        </div>`
      : '';

    html = html.replace(
      /\{\{#if progressTracking\}\}[\s\S]*?\{\{\/if\}\}/,
      progressHtml,
    );

    html = html.replace(
      /\{\{#if tips\.length\}\}[\s\S]*?\{\{\/if\}\}/,
      this.buildTipsHtml(content.tips),
    );

    return html;
  }

  private buildDailyRoutineHtml(html: string, data: PdfRenderData): string {
    const content = data.content as DailyRoutineContent;
    const domainTags = this.getDomainTags(data.targetDomains);
    const date = this.formatDate();

    const activityTypeLabels: Record<string, string> = {
      routine: 'Routine',
      therapeutic: 'Therapeutic',
      play: 'Play',
      rest: 'Rest',
      transition: 'Transition',
    };

    const periodIcons: Record<string, string> = {
      morning: '🌅',
      afternoon: '☀️',
      evening: '🌙',
    };

    html = html.replace(/\{\{title\}\}/g, this.escapeHtml(content.title));
    html = html.replace('{{difficultyLabel}}', this.getDifficultyLabel(data.difficulty));
    html = html.replace('{{date}}', date);
    html = html.replace('{{setting}}', data.setting);
    html = html.replace('{{dayType}}', '');
    html = html.replace('{{instructions}}', this.escapeHtml(content.instructions));
    html = html.replace('{{notesPrompt}}', this.escapeHtml(content.notesPrompt || ''));

    html = html.replace(
      /\{\{#each domainTags\}\}[\s\S]*?\{\{\/each\}\}/,
      domainTags.map((t) => `<span class="meta-tag">${this.escapeHtml(t)}</span>`).join(''),
    );

    // Group time blocks into periods
    const periods = this.groupTimeBlocksIntoPeriods(content.timeBlocks);

    const periodsHtml = periods
      .map((period) => {
        const periodId = period.id;
        const icon = periodIcons[periodId] || '📋';

        const blocksHtml = period.blocks
          .map((block) => {
            const actType = (block.activity?.type || 'routine').toLowerCase();
            const typeLabel = activityTypeLabels[actType] || actType;

            const transitionHtml = block.transitionWarning
              ? `<div class="transition-warning">
                  <span class="transition-warning-icon">&#9888;</span>
                  <span class="transition-warning-text">${this.escapeHtml(block.transitionWarning)}</span>
                </div>`
              : '';

            return `
            <div class="time-block">
              <div class="time-block-time">
                <div class="block-start">${this.escapeHtml(block.startTime)}</div>
                <div class="block-end">${this.escapeHtml(block.endTime)}</div>
              </div>
              <div class="time-block-content">
                <div class="time-block-header">
                  <div class="time-block-name">${this.escapeHtml(block.activity?.name || '')}</div>
                  <span class="activity-type-badge badge-${actType}">${typeLabel}</span>
                </div>
                ${block.activity?.description ? `<div class="time-block-description">${this.escapeHtml(block.activity.description)}</div>` : ''}
                ${transitionHtml}
              </div>
            </div>`;
          })
          .join('');

        const firstBlock = period.blocks[0];
        const lastBlock = period.blocks[period.blocks.length - 1];

        return `
        <div class="routine-period routine-period-${periodId}">
          <div class="period-header period-header-${periodId}">
            <div class="period-icon">${icon}</div>
            <div class="period-title">${this.escapeHtml(period.title)}</div>
            <div class="period-time-range">${firstBlock?.startTime || ''} &ndash; ${lastBlock?.endTime || ''}</div>
          </div>
          <div class="time-blocks">${blocksHtml}</div>
        </div>`;
      })
      .join('\n');

    html = html.replace(
      /\{\{#each periods\}\}[\s\S]*?\{\{\/each\}\}/,
      periodsHtml,
    );

    // Sensory breaks
    const sensoryHtml = content.sensoryBreaks?.length
      ? `<div class="sensory-breaks-section">
          <h2>Sensory Break Menu</h2>
          <div class="sensory-break-cards">
            ${content.sensoryBreaks.map((b) => `
              <div class="sensory-break-card">
                <div class="sensory-break-content">
                  <div class="sensory-break-name">${this.escapeHtml(b.name)}</div>
                  <div class="sensory-break-desc">${this.escapeHtml(b.description)}</div>
                  <div class="sensory-break-duration">${this.escapeHtml(b.duration)}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>`
      : '';

    html = html.replace(
      /\{\{#if sensoryBreaks\.length\}\}[\s\S]*?\{\{\/if\}\}/,
      sensoryHtml,
    );

    html = html.replace(
      /\{\{#if tips\.length\}\}[\s\S]*?\{\{\/if\}\}/,
      this.buildTipsHtml(content.tips),
    );

    return html;
  }

  private groupTimeBlocksIntoPeriods(
    timeBlocks: DailyRoutineContent['timeBlocks'],
  ): Array<{ id: string; title: string; blocks: DailyRoutineContent['timeBlocks'] }> {
    const morningBlocks: DailyRoutineContent['timeBlocks'] = [];
    const afternoonBlocks: DailyRoutineContent['timeBlocks'] = [];
    const eveningBlocks: DailyRoutineContent['timeBlocks'] = [];

    for (const block of timeBlocks) {
      const period = (block.period || '').toLowerCase();
      if (period.includes('afternoon')) {
        afternoonBlocks.push(block);
      } else if (period.includes('evening') || period.includes('night')) {
        eveningBlocks.push(block);
      } else {
        morningBlocks.push(block);
      }
    }

    const periods: Array<{ id: string; title: string; blocks: DailyRoutineContent['timeBlocks'] }> = [];
    if (morningBlocks.length) periods.push({ id: 'morning', title: 'Morning', blocks: morningBlocks });
    if (afternoonBlocks.length) periods.push({ id: 'afternoon', title: 'Afternoon', blocks: afternoonBlocks });
    if (eveningBlocks.length) periods.push({ id: 'evening', title: 'Evening', blocks: eveningBlocks });

    return periods;
  }

  // ─── Shared Helpers ────────────────────────────────────────

  private buildTipsHtml(tips?: string[]): string {
    if (!tips?.length) return '';
    return `<div class="tips-section">
      <h2>Tips for Success</h2>
      <ul>${tips.map((t) => `<li>${this.escapeHtml(t)}</li>`).join('')}</ul>
    </div>`;
  }

  private buildNotesHtml(notesPrompt?: string): string {
    return `
      <div class="notes-section">
        <h2>Observation Notes</h2>
        <p class="notes-prompt">${this.escapeHtml(notesPrompt || 'Record your observations during the activity.')}</p>
        <div class="notes-lines">
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
        </div>
      </div>`;
  }

  private getDifficultyLabel(difficulty: string): string {
    const labels: Record<string, string> = {
      FOUNDATIONAL: 'Foundational',
      DEVELOPING: 'Developing',
      STRENGTHENING: 'Strengthening',
    };
    return labels[difficulty] ?? difficulty;
  }

  private getDurationLabel(duration: string): string {
    const labels: Record<string, string> = {
      '5min': '5 minutes',
      '10min': '10 minutes',
      '15min': '15 minutes',
      '20plus': '20+ minutes',
    };
    return labels[duration] ?? duration;
  }

  private getDomainTags(targetDomains: string[]): string[] {
    return targetDomains.map(
      (d) => DEVELOPMENTAL_DOMAINS[d as keyof typeof DEVELOPMENTAL_DOMAINS]?.label ?? d,
    );
  }

  private formatDate(): string {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private async uploadToSupabase(
    buffer: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    const filePath = `generated/${fileName}`;

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filePath, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase PDF upload failed: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  private async uploadPreview(buffer: Buffer, fileName: string): Promise<string> {
    const filePath = `previews/${fileName}`;

    const { error } = await this.supabase.storage
      .from('worksheet-images')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      this.logger.warn(`Preview upload failed: ${error.message}`);
      return '';
    }

    const { data: urlData } = this.supabase.storage
      .from('worksheet-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }
}
