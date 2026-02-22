import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvoiceService } from './invoice.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { ListInvoicesQueryDto } from './dto/invoice.dto';
@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(
    private invoiceService: InvoiceService,
    private invoicePdfService: InvoicePdfService,
  ) {}

  @Get('session/:sessionId')
  async getSessionInvoice(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ) {
    return this.invoiceService.getSessionInvoice(sessionId, req.user.id);
  }

  @Get('my')
  async getMyInvoices(
    @Req() req: any,
    @Query() query: ListInvoicesQueryDto,
  ) {
    return this.invoiceService.getPatientInvoices(req.user.id, query);
  }

  @Get(':invoiceId/pdf')
  async downloadPdf(
    @Param('invoiceId') invoiceId: string,
    @Req() req: any,
    @Res() reply: any,
  ) {
    const invoice = await this.invoiceService.getInvoiceById(invoiceId, req.user.id);

    const pdfBuffer = await this.invoicePdfService.generatePdf({
      invoiceId: invoice.id,
      clinicName: invoice.clinicName,
      patientName: invoice.patient.name ?? 'Patient',
      therapistName: invoice.therapist.name ?? 'Therapist',
      sessionDate: invoice.session.scheduledAt,
      sessionType: invoice.session.sessionType,
      duration: invoice.session.actualDuration,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      status: invoice.status,
      issuedAt: invoice.issuedAt,
      notes: invoice.notes,
    });

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="invoice-${invoice.id.slice(-8)}.pdf"`)
      .send(pdfBuffer);
  }
}
