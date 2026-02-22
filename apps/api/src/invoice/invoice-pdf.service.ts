import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

interface InvoicePdfData {
  invoiceId: string;
  clinicName?: string | null;
  patientName: string;
  therapistName: string;
  sessionDate: Date;
  sessionType?: string | null;
  duration?: number | null;
  amount: number;
  currency: string;
  status: string;
  issuedAt?: Date | null;
  notes?: string | null;
}

@Injectable()
export class InvoicePdfService {
  generatePdf(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(24)
        .fillColor('#0d9488')
        .text(data.clinicName || 'Upllyft', 50, 50);

      doc
        .fontSize(10)
        .fillColor('#6b7280')
        .text('INVOICE', 450, 50, { align: 'right' });

      doc
        .fontSize(10)
        .fillColor('#111827')
        .text(`#${data.invoiceId.slice(-8).toUpperCase()}`, 450, 65, { align: 'right' });

      // Divider
      doc
        .moveTo(50, 100)
        .lineTo(545, 100)
        .strokeColor('#e5e7eb')
        .stroke();

      // Invoice details
      let y = 120;

      doc.fontSize(10).fillColor('#6b7280').text('Issued:', 50, y);
      doc.fontSize(10).fillColor('#111827').text(
        data.issuedAt ? new Date(data.issuedAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        }) : 'N/A',
        120, y,
      );

      doc.fontSize(10).fillColor('#6b7280').text('Status:', 350, y);
      doc.fontSize(10).fillColor('#111827').text(data.status, 400, y);

      y += 30;

      doc.fontSize(10).fillColor('#6b7280').text('Patient:', 50, y);
      doc.fontSize(10).fillColor('#111827').text(data.patientName, 120, y);

      doc.fontSize(10).fillColor('#6b7280').text('Therapist:', 350, y);
      doc.fontSize(10).fillColor('#111827').text(data.therapistName, 420, y);

      // Session details table
      y += 50;
      doc
        .moveTo(50, y)
        .lineTo(545, y)
        .strokeColor('#e5e7eb')
        .stroke();

      y += 10;
      doc.fontSize(10).fillColor('#6b7280');
      doc.text('Description', 50, y);
      doc.text('Date', 250, y);
      doc.text('Duration', 370, y);
      doc.text('Amount', 470, y, { align: 'right' });

      y += 20;
      doc
        .moveTo(50, y)
        .lineTo(545, y)
        .strokeColor('#e5e7eb')
        .stroke();

      y += 10;
      doc.fontSize(10).fillColor('#111827');
      doc.text(data.sessionType || 'Therapy Session', 50, y);
      doc.text(
        new Date(data.sessionDate).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
        250, y,
      );
      doc.text(data.duration ? `${data.duration} min` : '—', 370, y);
      doc.text(
        new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.amount),
        470, y,
        { align: 'right' },
      );

      // Total
      y += 40;
      doc
        .moveTo(350, y)
        .lineTo(545, y)
        .strokeColor('#e5e7eb')
        .stroke();

      y += 10;
      doc.fontSize(12).fillColor('#0d9488').font('Helvetica-Bold');
      doc.text('Total:', 350, y);
      doc.text(
        new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.amount),
        470, y,
        { align: 'right' },
      );

      // Notes
      if (data.notes) {
        y += 50;
        doc.fontSize(10).fillColor('#6b7280').font('Helvetica');
        doc.text('Notes:', 50, y);
        y += 15;
        doc.fontSize(10).fillColor('#111827');
        doc.text(data.notes, 50, y, { width: 495 });
      }

      // Footer
      doc
        .fontSize(8)
        .fillColor('#9ca3af')
        .font('Helvetica')
        .text(
          'This invoice was generated automatically by Upllyft. For questions, contact support@upllyft.com',
          50,
          750,
          { align: 'center', width: 495 },
        );

      doc.end();
    });
  }
}
