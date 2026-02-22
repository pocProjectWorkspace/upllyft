import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InvoiceService } from './invoice.service';

@Injectable()
export class InvoiceListeners {
  private readonly logger = new Logger(InvoiceListeners.name);

  constructor(private invoiceService: InvoiceService) {}

  @OnEvent('session.signed')
  async handleSessionSigned(payload: {
    sessionId: string;
    caseId: string;
    therapistId: string;
  }) {
    try {
      await this.invoiceService.createFromSignedSession(payload.sessionId);
      this.logger.log(`Invoice created for signed session ${payload.sessionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to create invoice for session ${payload.sessionId}`,
        error,
      );
    }
  }
}
