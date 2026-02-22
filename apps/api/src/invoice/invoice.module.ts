import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoiceService } from './invoice.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceController } from './invoice.controller';
import { InvoiceListeners } from './invoice.listeners';

@Module({
  imports: [PrismaModule],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoicePdfService, InvoiceListeners],
  exports: [InvoiceService],
})
export class InvoiceModule {}
