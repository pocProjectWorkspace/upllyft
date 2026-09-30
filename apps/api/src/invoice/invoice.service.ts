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

/** ISO country → billing currency. Mirrors REGION_CONFIGS in packages/types/src/region.ts. */
function currencyForCountry(country: string | null | undefined): string {
  switch (country) {
    case 'AE':
      return 'AED';
    case 'SA':
      return 'SAR';
    default:
      return 'INR';
  }
}

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
                profile: { select: { userId: true, user: { select: { country: true } } } },
              },
            },
            clinic: { select: { country: true } },
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
    // The booking's own currency; without a booking, the clinic's (then the family's)
    // country decides — this used to assume AED for everyone.
    const currency =
      session.booking?.currency ??
      currencyForCountry(session.case?.clinic?.country ?? session.case?.child?.profile?.user?.country);

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

    const [invoices, totals] = await Promise.all([
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
      // Totals per currency AND status: a family seen in India and the UAE has rupee
      // and dirham invoices, which must never be added together.
      this.prisma.invoice.groupBy({
        by: ['currency', 'status'],
        where: { patientId },
        _sum: { amount: true },
      }),
    ]);

    const byCurrency = new Map<string, { currency: string; totalBilled: number; totalPaid: number; totalOutstanding: number }>();
    for (const row of totals) {
      const entry = byCurrency.get(row.currency) ?? {
        currency: row.currency,
        totalBilled: 0,
        totalPaid: 0,
        totalOutstanding: 0,
      };
      const amount = Number(row._sum.amount ?? 0);
      entry.totalBilled += amount;
      if (row.status === InvoiceStatus.PAID) entry.totalPaid += amount;
      if (row.status === InvoiceStatus.DRAFT || row.status === InvoiceStatus.ISSUED) {
        entry.totalOutstanding += amount;
      }
      byCurrency.set(row.currency, entry);
    }
    const currencies = [...byCurrency.values()].sort((a, b) => b.totalBilled - a.totalBilled);
    // The flat totals stay for existing clients, in the family's main currency only.
    const primary = currencies[0];

    const hasMore = invoices.length > limit;
    if (hasMore) invoices.pop();

    return {
      invoices,
      nextCursor: hasMore ? invoices[invoices.length - 1]?.id : null,
      summary: {
        currency: primary?.currency ?? null,
        totalBilled: primary?.totalBilled ?? 0,
        totalPaid: primary?.totalPaid ?? 0,
        totalOutstanding: primary?.totalOutstanding ?? 0,
        byCurrency: currencies,
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
