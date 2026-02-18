import PDFDocument from 'pdfkit';
import {
  PAGE,
  CONTENT_WIDTH,
  FONT,
  SIZE,
  COLOR,
  SPACE,
} from './pdf-styles';

/**
 * Thin wrapper around PDFKit that provides high-level helpers
 * for building assessment PDF reports.
 */
export class PdfBuilder {
  readonly doc: PDFKit.PDFDocument;

  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: PAGE.marginTop,
        bottom: PAGE.marginBottom,
        left: PAGE.marginLeft,
        right: PAGE.marginRight,
      },
      bufferPages: true,
      info: {
        Title: 'Assessment Report',
        Author: 'Upllyft',
      },
    });
  }

  // ── Space Management ───────────────────────────────────────────────────

  /** Usable vertical space remaining on the current page. */
  get remainingSpace(): number {
    return PAGE.height - PAGE.marginBottom - this.doc.y;
  }

  /** If `height` won't fit on the current page, add a new page first. */
  ensureSpace(height: number): void {
    if (this.remainingSpace < height) {
      this.doc.addPage();
    }
  }

  moveDown(lines = 1): void {
    this.doc.moveDown(lines);
  }

  // ── Text Primitives ────────────────────────────────────────────────────

  heading1(text: string, color = COLOR.primaryDark): void {
    this.ensureSpace(40);
    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.h1)
      .fillColor(color)
      .text(text, { align: 'center' });
    this.moveDown(0.3);
  }

  heading2(text: string, color = COLOR.textMain): void {
    this.ensureSpace(30);
    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.h2)
      .fillColor(color)
      .text(text);
    this.moveDown(0.3);
  }

  heading3(text: string, color = COLOR.textMain): void {
    this.ensureSpace(24);
    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.h3)
      .fillColor(color)
      .text(text);
    this.moveDown(0.2);
  }

  bodyText(text: string, options?: PDFKit.Mixins.TextOptions): void {
    this.doc
      .font(FONT.regular)
      .fontSize(SIZE.body)
      .fillColor(COLOR.textMain)
      .text(text, options);
  }

  mutedText(text: string, size = SIZE.small): void {
    this.doc
      .font(FONT.regular)
      .fontSize(size)
      .fillColor(COLOR.textMuted)
      .text(text);
  }

  labelValue(label: string, value: string, x: number, y: number, width: number): void {
    this.doc
      .font(FONT.regular)
      .fontSize(SIZE.caption)
      .fillColor(COLOR.textMuted)
      .text(label.toUpperCase(), x, y, { width });
    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.body)
      .fillColor(COLOR.textMain)
      .text(value, x, y + 14, { width });
  }

  // ── Layout Components ──────────────────────────────────────────────────

  /** Centered header with title, subtitle, and date line. */
  reportHeader(title: string, subtitle: string, dateLine: string): void {
    this.heading1(title);
    this.doc
      .font(FONT.regular)
      .fontSize(SIZE.small)
      .fillColor(COLOR.textMuted)
      .text(subtitle, { align: 'center' });
    this.doc.text(dateLine, { align: 'center' });
    this.moveDown(0.5);

    // Divider line
    const y = this.doc.y;
    this.doc
      .moveTo(PAGE.marginLeft, y)
      .lineTo(PAGE.width - PAGE.marginRight, y)
      .strokeColor(COLOR.primary)
      .lineWidth(2)
      .stroke();
    this.moveDown(1);
  }

  /** 2×2 info grid inside a rounded box. */
  infoGrid(title: string, items: { label: string; value: string }[]): void {
    const boxHeight = 90;
    this.ensureSpace(boxHeight + 20);

    const x = PAGE.marginLeft;
    const y = this.doc.y;

    // Background box
    this.roundedRect(x, y, CONTENT_WIDTH, boxHeight, 6, COLOR.bgGray);

    // Title
    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.h3)
      .fillColor(COLOR.textMain)
      .text(title, x + SPACE.lg, y + SPACE.md);

    // Grid (2 columns)
    const colWidth = (CONTENT_WIDTH - SPACE.lg * 2) / 2;
    const startY = y + 34;
    items.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      this.labelValue(
        item.label,
        item.value,
        x + SPACE.lg + col * colWidth,
        startY + row * 28,
        colWidth,
      );
    });

    this.doc.y = y + boxHeight + SPACE.lg;
  }

  /** Big centered score box with solid background. */
  scoreBox(
    title: string,
    scoreText: string,
    statusLabel: string,
    statusColor: string,
  ): void {
    const boxH = 100;
    this.ensureSpace(boxH + 20);

    const x = PAGE.marginLeft;
    const y = this.doc.y;

    // Solid blue background
    this.roundedRect(x, y, CONTENT_WIDTH, boxH, 6, COLOR.scoreBg);

    // Title
    this.doc
      .font(FONT.regular)
      .fontSize(SIZE.h3)
      .fillColor(COLOR.white)
      .text(title, x, y + SPACE.md, { width: CONTENT_WIDTH, align: 'center' });

    // Score
    this.doc
      .font(FONT.bold)
      .fontSize(36)
      .fillColor(COLOR.white)
      .text(scoreText, x, y + 30, { width: CONTENT_WIDTH, align: 'center' });

    // Status badge
    const badgeW = 120;
    const badgeX = x + (CONTENT_WIDTH - badgeW) / 2;
    const badgeY = y + 72;
    this.roundedRect(badgeX, badgeY, badgeW, 20, 10, COLOR.white);
    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.small)
      .fillColor(statusColor)
      .text(statusLabel, badgeX, badgeY + 4, { width: badgeW, align: 'center' });

    this.doc.y = y + boxH + SPACE.lg;
  }

  /** Embed a PNG chart buffer. */
  chartImage(buffer: Buffer): void {
    const imgWidth = CONTENT_WIDTH - 40;
    const imgHeight = imgWidth * 0.5; // 2:1 aspect ratio
    this.ensureSpace(imgHeight + 20);
    this.doc.image(buffer, PAGE.marginLeft + 20, this.doc.y, {
      width: imgWidth,
    });
    this.doc.y += imgHeight + SPACE.lg;
  }

  /** Domain card with name, status pill, score, and text content. */
  domainCard(
    name: string,
    status: 'GREEN' | 'YELLOW' | 'RED',
    riskPercent: string,
    interpretation: string,
  ): void {
    // Measure text height to size the card
    const textH = this.measureHeight(interpretation, CONTENT_WIDTH - SPACE.lg * 2);
    const cardH = 60 + textH + SPACE.lg;
    this.ensureSpace(cardH + SPACE.lg);

    const x = PAGE.marginLeft;
    const y = this.doc.y;

    // Card border
    this.doc
      .roundedRect(x, y, CONTENT_WIDTH, cardH, 6)
      .strokeColor(COLOR.borderLight)
      .lineWidth(1)
      .stroke();

    // Left accent bar
    const accentColor = status === 'GREEN' ? COLOR.green : status === 'YELLOW' ? COLOR.yellow : COLOR.red;
    this.doc.rect(x, y, 4, cardH).fill(accentColor);

    // Domain name
    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.h3)
      .fillColor(COLOR.textMain)
      .text(name, x + SPACE.lg, y + SPACE.md);

    // Status pill
    const { bg, text: textColor, label } = statusPillStyle(status);
    const pillW = 80;
    const pillX = x + CONTENT_WIDTH - pillW - SPACE.lg;
    const pillY = y + SPACE.md;
    this.roundedRect(pillX, pillY, pillW, 20, 10, bg);
    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.caption)
      .fillColor(textColor)
      .text(label, pillX, pillY + 4, { width: pillW, align: 'center' });

    // Risk score
    this.doc
      .font(FONT.regular)
      .fontSize(SIZE.small)
      .fillColor(COLOR.textMuted)
      .text(`Risk Index: ${riskPercent}`, x + SPACE.lg, y + 34);

    // Interpretation
    this.doc
      .font(FONT.regular)
      .fontSize(SIZE.body)
      .fillColor(COLOR.textMain)
      .text(interpretation, x + SPACE.lg, y + 50, {
        width: CONTENT_WIDTH - SPACE.lg * 2,
      });

    this.doc.y = y + cardH + SPACE.md;
  }

  /** Colored background box for synthesis / narrative content. */
  coloredBox(
    text: string,
    bgColor = COLOR.bgBlue,
    borderColor = COLOR.bgBlueBorder,
  ): void {
    const textH = this.measureHeight(text, CONTENT_WIDTH - SPACE.xl * 2);
    const boxH = textH + SPACE.xl * 2;
    this.ensureSpace(boxH + SPACE.md);

    const x = PAGE.marginLeft;
    const y = this.doc.y;

    this.roundedRect(x, y, CONTENT_WIDTH, boxH, 8, bgColor);
    this.doc
      .roundedRect(x, y, CONTENT_WIDTH, boxH, 8)
      .strokeColor(borderColor)
      .lineWidth(1)
      .stroke();

    this.doc
      .font(FONT.regular)
      .fontSize(SIZE.body)
      .fillColor(COLOR.textMain)
      .text(text, x + SPACE.xl, y + SPACE.xl, {
        width: CONTENT_WIDTH - SPACE.xl * 2,
      });

    this.doc.y = y + boxH + SPACE.lg;
  }

  // ── Lists ──────────────────────────────────────────────────────────────

  bulletList(items: string[], bulletChar = '\u2022'): void {
    for (const item of items) {
      const textH = this.measureHeight(item, CONTENT_WIDTH - 30);
      this.ensureSpace(textH + SPACE.sm);

      const x = PAGE.marginLeft + SPACE.lg;
      const y = this.doc.y;
      this.doc
        .font(FONT.regular)
        .fontSize(SIZE.body)
        .fillColor(COLOR.textMuted)
        .text(bulletChar, x, y, { continued: false });
      this.doc
        .font(FONT.regular)
        .fontSize(SIZE.body)
        .fillColor(COLOR.textMain)
        .text(item, x + 14, y, { width: CONTENT_WIDTH - 30 - 14 });

      this.doc.y = y + textH + SPACE.xs;
    }
  }

  arrowList(items: string[]): void {
    this.bulletList(items, '\u2192');
  }

  // ── Footer / Disclaimers ───────────────────────────────────────────────

  disclaimerBox(text: string): void {
    const textH = this.measureHeight(text, CONTENT_WIDTH - SPACE.xl * 2, FONT.regular, SIZE.small);
    const boxH = textH + SPACE.xl;
    this.ensureSpace(boxH + SPACE.md);

    const x = PAGE.marginLeft;
    const y = this.doc.y;

    this.roundedRect(x, y, CONTENT_WIDTH, boxH, 6, COLOR.bgRedLight);
    this.doc
      .roundedRect(x, y, CONTENT_WIDTH, boxH, 6)
      .strokeColor(COLOR.bgRedBorder)
      .lineWidth(1)
      .stroke();

    this.doc
      .font(FONT.regular)
      .fontSize(SIZE.small)
      .fillColor(COLOR.redText)
      .text(text, x + SPACE.xl, y + SPACE.md, {
        width: CONTENT_WIDTH - SPACE.xl * 2,
      });

    this.doc.y = y + boxH + SPACE.lg;
  }

  footer(lines: string[]): void {
    this.ensureSpace(60);
    const y = this.doc.y;

    // Top border
    this.doc
      .moveTo(PAGE.marginLeft, y)
      .lineTo(PAGE.width - PAGE.marginRight, y)
      .strokeColor(COLOR.borderLight)
      .lineWidth(1)
      .stroke();

    this.doc.y = y + SPACE.md;

    for (const line of lines) {
      this.doc
        .font(FONT.regular)
        .fontSize(SIZE.caption)
        .fillColor(COLOR.textMuted)
        .text(line, { align: 'center' });
    }
  }

  // ── Section title with left accent bar (V2 style) ─────────────────────

  sectionTitle(text: string): void {
    this.ensureSpace(30);
    const x = PAGE.marginLeft;
    const y = this.doc.y;

    // Accent bar
    this.doc.rect(x, y, 4, 18).fill(COLOR.primary);

    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.h2)
      .fillColor(COLOR.textMain)
      .text(text, x + SPACE.md, y);

    this.moveDown(0.5);
  }

  // ── Correlation card (V2) ─────────────────────────────────────────────

  correlationCard(
    observation: string,
    relatedHistory: string,
    insight: string,
    confidence: string,
  ): void {
    const parts = [observation, `Related History: ${relatedHistory}`, insight, `Confidence: ${confidence}`];
    const fullText = parts.join('\n');
    const textH = this.measureHeight(fullText, CONTENT_WIDTH - SPACE.xl * 2);
    const boxH = textH + SPACE.xl + SPACE.md;
    this.ensureSpace(boxH + SPACE.md);

    const x = PAGE.marginLeft;
    const y = this.doc.y;

    this.roundedRect(x, y, CONTENT_WIDTH, boxH, 6, COLOR.bgYellow);
    this.doc
      .roundedRect(x, y, CONTENT_WIDTH, boxH, 6)
      .strokeColor(COLOR.bgYellowBorder)
      .lineWidth(1)
      .stroke();

    let curY = y + SPACE.md;
    const innerW = CONTENT_WIDTH - SPACE.xl * 2;

    // Observation (bold)
    this.doc.font(FONT.bold).fontSize(SIZE.body).fillColor(COLOR.textMain)
      .text(observation, x + SPACE.xl, curY, { width: innerW });
    curY += this.doc.heightOfString(observation, { width: innerW }) + SPACE.xs;

    // Related History
    this.doc.font(FONT.bold).fontSize(SIZE.body).fillColor(COLOR.textMain)
      .text('Related History: ', x + SPACE.xl, curY, { width: innerW, continued: true });
    this.doc.font(FONT.regular).text(relatedHistory, { width: innerW });
    curY = this.doc.y + SPACE.xs;

    // Insight
    this.doc.font(FONT.regular).fontSize(SIZE.body).fillColor(COLOR.textMain)
      .text(insight, x + SPACE.xl, curY, { width: innerW });
    curY = this.doc.y + SPACE.xs;

    // Confidence
    this.doc.font(FONT.regular).fontSize(SIZE.caption).fillColor(COLOR.textMuted)
      .text(`Confidence: ${confidence}`, x + SPACE.xl, curY, { width: innerW });

    this.doc.y = y + boxH + SPACE.md;
  }

  // ── Question / Answer item (V1 detailed) ──────────────────────────────

  questionItem(question: string, answer: string, whyWeAsk?: string): void {
    const textH = this.measureHeight(question, CONTENT_WIDTH - SPACE.xl * 2);
    const itemH = textH + 30 + (whyWeAsk ? 16 : 0);
    this.ensureSpace(itemH + SPACE.sm);

    const x = PAGE.marginLeft;
    const y = this.doc.y;

    this.doc
      .roundedRect(x + SPACE.lg, y, CONTENT_WIDTH - SPACE.lg * 2, itemH, 4)
      .strokeColor(COLOR.borderLight)
      .lineWidth(1)
      .stroke();

    const innerX = x + SPACE.xl;
    const innerW = CONTENT_WIDTH - SPACE.xl * 2 - SPACE.lg;

    // Question text
    this.doc
      .font(FONT.regular)
      .fontSize(SIZE.body)
      .fillColor(COLOR.textMain)
      .text(question, innerX, y + SPACE.sm, { width: innerW });

    // Answer
    const ansY = y + textH + SPACE.md;
    this.doc
      .font(FONT.regular)
      .fontSize(SIZE.small)
      .fillColor(COLOR.textMuted)
      .text('Answer: ', innerX, ansY, { continued: true });
    this.doc
      .font(FONT.bold)
      .fillColor(COLOR.textMain)
      .text(answer);

    // Why we ask
    if (whyWeAsk) {
      this.doc
        .font(FONT.oblique)
        .fontSize(SIZE.caption)
        .fillColor(COLOR.textLight)
        .text(`Why we ask: ${whyWeAsk}`, innerX, this.doc.y + 2, { width: innerW });
    }

    this.doc.y = y + itemH + SPACE.sm;
  }

  // ── Framework description box (V1) ────────────────────────────────────

  frameworkBox(title: string, paragraphs: string[]): void {
    // Measure total height
    let totalH = 30; // title
    for (const p of paragraphs) {
      totalH += this.measureHeight(p, CONTENT_WIDTH - SPACE.xl * 2, FONT.regular, SIZE.caption) + SPACE.sm;
    }
    totalH += SPACE.xl;

    this.ensureSpace(Math.min(totalH, 300)); // don't overshoot for very long boxes

    const x = PAGE.marginLeft;
    const y = this.doc.y;

    // Background
    this.roundedRect(x, y, CONTENT_WIDTH, totalH, 6, COLOR.bgSkyLight);
    this.doc
      .roundedRect(x, y, CONTENT_WIDTH, totalH, 6)
      .strokeColor(COLOR.bgSkyBorder)
      .lineWidth(1)
      .stroke();

    // Title
    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.h3)
      .fillColor(COLOR.primaryDark)
      .text(title, x + SPACE.xl, y + SPACE.md, { width: CONTENT_WIDTH - SPACE.xl * 2 });

    // Paragraphs
    for (const p of paragraphs) {
      this.doc
        .font(FONT.regular)
        .fontSize(SIZE.caption)
        .fillColor('#1e3a5f')
        .text(p, x + SPACE.xl, this.doc.y + SPACE.sm, { width: CONTENT_WIDTH - SPACE.xl * 2 });
    }

    this.doc.y = y + totalH + SPACE.lg;
  }

  // ── Recommendations box (V1) ──────────────────────────────────────────

  recommendationsBox(title: string, items: string[]): void {
    let totalH = 30;
    for (const item of items) {
      totalH += this.measureHeight(item, CONTENT_WIDTH - SPACE.xl * 2 - 20) + SPACE.sm;
    }
    totalH += SPACE.xl;

    this.ensureSpace(Math.min(totalH, 200));

    const x = PAGE.marginLeft;
    const y = this.doc.y;

    // Yellow background with left border
    this.roundedRect(x, y, CONTENT_WIDTH, totalH, 6, COLOR.bgYellowBorder);
    this.doc.rect(x, y, 4, totalH).fill(COLOR.yellow);

    // Title
    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.h2)
      .fillColor('#92400e')
      .text(title, x + SPACE.xl, y + SPACE.md, { width: CONTENT_WIDTH - SPACE.xl * 2 });

    // Items
    let curY = this.doc.y + SPACE.sm;
    for (const item of items) {
      this.doc
        .font(FONT.bold)
        .fontSize(SIZE.body)
        .fillColor(COLOR.yellow)
        .text('\u2713', x + SPACE.xl, curY);
      this.doc
        .font(FONT.regular)
        .fontSize(SIZE.body)
        .fillColor('#78350f')
        .text(item, x + SPACE.xl + 18, curY, { width: CONTENT_WIDTH - SPACE.xl * 2 - 20 });
      curY = this.doc.y + SPACE.xs;
    }

    this.doc.y = y + totalH + SPACE.lg;
  }

  // ── V2 Domain Deep-Dive card ──────────────────────────────────────────

  v2DomainCard(
    name: string,
    status: string,
    scorePercent: number,
    clinicalAnalysis: string,
    impactOnDailyLife?: string,
    trajectory?: string,
  ): void {
    // Measure content height
    const innerW = CONTENT_WIDTH - SPACE.xl * 2;
    let contentH = 40; // header
    contentH += this.measureHeight(clinicalAnalysis, innerW);
    if (impactOnDailyLife) {
      contentH += 20 + this.measureHeight(impactOnDailyLife, innerW);
    }
    if (trajectory) {
      contentH += 20 + this.measureHeight(trajectory, innerW);
    }
    contentH += SPACE.xl;
    this.ensureSpace(Math.min(contentH, 400));

    const x = PAGE.marginLeft;
    const y = this.doc.y;

    // Card border
    this.doc
      .roundedRect(x, y, CONTENT_WIDTH, contentH, 8)
      .strokeColor(COLOR.border)
      .lineWidth(1)
      .stroke();

    // Domain name
    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.h3 + 1)
      .fillColor(COLOR.textMain)
      .text(name, x + SPACE.xl, y + SPACE.lg, { width: innerW - 120 });

    // Status pill
    const zone = resolveZone(status);
    const { bg, text: pillColor, label } = statusPillStyle(zone);
    const pillLabel = `${label} (${scorePercent}%)`;
    const pillW = 130;
    const pillX = x + CONTENT_WIDTH - pillW - SPACE.lg;
    const pillY = y + SPACE.lg;
    this.roundedRect(pillX, pillY, pillW, 20, 10, bg);
    this.doc
      .font(FONT.bold)
      .fontSize(SIZE.caption)
      .fillColor(pillColor)
      .text(pillLabel, pillX, pillY + 4, { width: pillW, align: 'center' });

    // Clinical Analysis
    let curY = y + 44;
    this.doc
      .font(FONT.regular)
      .fontSize(SIZE.body)
      .fillColor(COLOR.textMain)
      .text(clinicalAnalysis, x + SPACE.xl, curY, { width: innerW });
    curY = this.doc.y;

    if (impactOnDailyLife) {
      curY += SPACE.sm;
      this.doc.font(FONT.bold).fontSize(SIZE.small).fillColor(COLOR.textMuted)
        .text('Impact on Daily Life', x + SPACE.xl, curY, { width: innerW });
      this.doc.font(FONT.regular).fontSize(SIZE.body).fillColor(COLOR.textMain)
        .text(impactOnDailyLife, x + SPACE.xl, this.doc.y + 2, { width: innerW });
      curY = this.doc.y;
    }

    if (trajectory) {
      curY += SPACE.sm;
      this.doc.font(FONT.bold).fontSize(SIZE.small).fillColor(COLOR.textMuted)
        .text('Trajectory', x + SPACE.xl, curY, { width: innerW });
      this.doc.font(FONT.regular).fontSize(SIZE.body).fillColor(COLOR.textMain)
        .text(trajectory, x + SPACE.xl, this.doc.y + 2, { width: innerW });
    }

    this.doc.y = y + contentH + SPACE.md;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /** Measure text height after setting font + fontSize on the doc. */
  private measureHeight(text: string, width: number, font: string = FONT.regular, size: number = SIZE.body): number {
    this.doc.font(font).fontSize(size);
    return this.doc.heightOfString(text, { width });
  }

  /** Draw a filled rounded rectangle. */
  private roundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
  ): void {
    this.doc.roundedRect(x, y, w, h, r).fill(fill);
  }

  /** Collect the document into a Buffer. */
  async toBuffer(): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      this.doc.on('end', () => resolve(Buffer.concat(chunks)));
      this.doc.on('error', reject);
      this.doc.end();
    });
  }
}

// ── Utility functions ────────────────────────────────────────────────────

function resolveZone(status: string): 'GREEN' | 'YELLOW' | 'RED' {
  const s = (status || '').toLowerCase();
  if (s.includes('on track') || s === 'green') return 'GREEN';
  if (s.includes('monitor') || s === 'yellow') return 'YELLOW';
  return 'RED';
}

function statusPillStyle(status: 'GREEN' | 'YELLOW' | 'RED'): {
  bg: string;
  text: string;
  label: string;
} {
  switch (status) {
    case 'GREEN':
      return { bg: COLOR.greenBg, text: COLOR.greenText, label: 'On Track' };
    case 'YELLOW':
      return { bg: COLOR.yellowBg, text: COLOR.yellowText, label: 'Monitor' };
    case 'RED':
      return { bg: COLOR.redBg, text: COLOR.redText, label: 'Needs Attention' };
  }
}
