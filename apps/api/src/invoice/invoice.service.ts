import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { ListInvoicesQueryDto } from './dto/invoice.dto';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create an invoice from a signed session. Idempotent — skips if one already exists.
   */
  async createFromSignedSession(sessionId: string) {
    // Idempotent check
    const existing = await this.prisma.invoice.findUnique({
      where: { sessionId },
    });
    if (existing) {
      this.logger.log(`Invoice already exists for session ${sessionId}, skipping`);
      return existing;
    }

    // Fetch session with related data
    const session = await this.prisma.caseSession.findUnique({
      where: { id: sessionId },
      include: {
        case: {
          include: {
            child: {
              include: {
                profile: { select: { userId: true } },
              },
            },
          },
        },
        booking: {
          select: { id: true, subtotal: true, currency: true },
        },
        therapist: { select: { id: true, name: true } },
      },
    });

    if (!session) {
      this.logger.error(`Session ${sessionId} not found for invoice creation`);
      return null;
    }

    // Resolve parent userId from the child's UserProfile
    const parentUserId = session.case?.child?.profile?.userId;
    if (!parentUserId) {
      this.logger.error(`Cannot resolve parent for session ${sessionId}`);
      return null;
    }

    const amount = session.booking?.subtotal ?? 0;
    const currency = session.booking?.currency ?? 'AED';

    const invoice = await this.prisma.invoice.create({
      data: {
        sessionId,
        bookingId: session.booking?.id ?? null,
        patientId: parentUserId,
        therapistId: session.therapistId,
        amount: new Prisma.Decimal(amount),
        currency,
        status: InvoiceStatus.DRAFT,
        issuedAt: new Date(),
      },
    });

    this.logger.log(`Invoice ${invoice.id} created for session ${sessionId}`);

    // Emit event for notification
    this.eventEmitter.emit('invoice.created', {
      invoiceId: invoice.id,
      sessionId,
      patientId: parentUserId,
      therapistId: session.therapistId,
      therapistName: session.therapist?.name ?? 'Your therapist',
      amount,
      currency,
    });

    return invoice;
  }

  /**
   * Get invoice for a specific session, with auth check.
   */
  async getSessionInvoice(sessionId: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { sessionId },
      include: {
        session: {
          select: {
            scheduledAt: true,
            sessionType: true,
            actualDuration: true,
            noteStatus: true,
          },
        },
        therapist: { select: { id: true, name: true, image: true } },
        patient: { select: { id: true, name: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found for this session');
    }

    // Auth: only patient or therapist can view
    if (invoice.patientId !== userId && invoice.therapistId !== userId) {
      throw new ForbiddenException('Not authorized to view this invoice');
    }

    return invoice;
  }

  /**
   * Get all invoices for a patient with cursor pagination and summary stats.
   */
  async getPatientInvoices(patientId: string, query: ListInvoicesQueryDto) {
    const { status, cursor, limit = 20 } = query;

    const where: Prisma.InvoiceWhereInput = { patientId };
    if (status) where.status = status;

    const [invoices, totalBilled, totalPaid, totalOutstanding] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        include: {
          session: {
            select: {
              scheduledAt: true,
              sessionType: true,
              actualDuration: true,
            },
          },
          therapist: { select: { id: true, name: true, image: true } },
        },
      }),
      this.prisma.invoice.aggregate({
        where: { patientId },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { patientId, status: InvoiceStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { patientId, status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED] } },
        _sum: { amount: true },
      }),
    ]);

    const hasMore = invoices.length > limit;
    if (hasMore) invoices.pop();

    return {
      invoices,
      nextCursor: hasMore ? invoices[invoices.length - 1]?.id : null,
      summary: {
        totalBilled: Number(totalBilled._sum.amount ?? 0),
        totalPaid: Number(totalPaid._sum.amount ?? 0),
        totalOutstanding: Number(totalOutstanding._sum.amount ?? 0),
      },
    };
  }

  /**
   * Get a single invoice by ID (for PDF generation).
   */
  async getInvoiceById(invoiceId: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        session: {
          select: {
            scheduledAt: true,
            sessionType: true,
            actualDuration: true,
          },
        },
        therapist: { select: { id: true, name: true, image: true } },
        patient: { select: { id: true, name: true, email: true } },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.patientId !== userId && invoice.therapistId !== userId) {
      throw new ForbiddenException('Not authorized to view this invoice');
    }

    return invoice;
  }
}
