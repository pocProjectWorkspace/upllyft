import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Bookings that still have to happen. A session type with any of these can't be
// deactivated or deleted, or the family's booking loses its service.
export const UPCOMING_BOOKING_STATUSES = ['PENDING_PAYMENT', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'CONFIRMED'] as const;

export async function assertNoUpcomingBookings(prisma: PrismaService, sessionTypeId: string, name: string) {
    const upcoming = await prisma.booking.count({
        where: {
            sessionTypeId,
            status: { in: [...UPCOMING_BOOKING_STATUSES] },
            startDateTime: { gte: new Date() },
        },
    });
    if (upcoming > 0) {
        throw new BadRequestException(
            `"${name}" has ${upcoming} upcoming booking${upcoming === 1 ? '' : 's'}. Complete or cancel them before removing it.`,
        );
    }
}
