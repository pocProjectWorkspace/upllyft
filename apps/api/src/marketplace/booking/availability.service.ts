import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    startOfDay,
    endOfDay,
    addDays,
    addMinutes,
    format,
    parseISO,
    differenceInMinutes,
    isBefore,
    isAfter,
    isWithinInterval,
    setHours,
    setMinutes,
    getDay,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

interface TimeSlot {
    start: Date;
    end: Date;
}

@Injectable()
export class AvailabilityService {
    private readonly logger = new Logger(AvailabilityService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Set recurring weekly availability for therapist
     */
    async setRecurringAvailability(
        therapistId: string,
        dayOfWeek: number, // 0 = Sunday, 6 = Saturday
        startTime: string, // "HH:mm" format
        endTime: string,
        timezone: string,
    ) {
        // Validate day of week
        if (dayOfWeek < 0 || dayOfWeek > 6) {
            throw new BadRequestException('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)');
        }

        // Validate time format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            throw new BadRequestException('Time must be in HH:mm format');
        }

        // Validate start before end
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (startMinutes >= endMinutes) {
            throw new BadRequestException('Start time must be before end time');
        }

        // Check for overlaps with existing active slots
        const existingSlots = await this.prisma.therapistAvailability.findMany({
            where: {
                therapistId,
                dayOfWeek,
                isActive: true,
            },
        });

        const hasOverlap = existingSlots.some((slot) => {
            const [sHour, sMin] = slot.startTime.split(':').map(Number);
            const [eHour, eMin] = slot.endTime.split(':').map(Number);
            const slotStart = sHour * 60 + sMin;
            const slotEnd = eHour * 60 + eMin;

            // Check if (StartA < EndB) and (EndA > StartB)
            return startMinutes < slotEnd && endMinutes > slotStart;
        });

        if (hasOverlap) {
            throw new BadRequestException('Time slot overlaps with an existing slot');
        }

        return this.prisma.therapistAvailability.create({
            data: {
                therapistId,
                dayOfWeek,
                startTime,
                endTime,
                timezone,
                isActive: true,
            },
        });
    }

    /**
     * Add availability exception (one-off available/blocked time)
     */
    async addAvailabilityException(
        therapistId: string,
        date: Date,
        type: 'AVAILABLE' | 'BLOCKED',
        startTime?: string,
        endTime?: string,
        reason?: string,
    ) {
        return this.prisma.availabilityException.create({
            data: {
                therapistId,
                date: startOfDay(date),
                type,
                startTime,
                endTime,
                reason,
            },
        });
    }

    /**
     * Get therapist's recurring availability for a specific day of week
     */
    async getRecurringAvailability(therapistId: string, dayOfWeek: number) {
        return this.prisma.therapistAvailability.findMany({
            where: {
                therapistId,
                dayOfWeek,
                isActive: true,
            },
            orderBy: {
                startTime: 'asc',
            },
        });
    }

    /**
     * Get availability exceptions for a date range
     */
    async getAvailabilityExceptions(
        therapistId: string,
        startDate: Date,
        endDate: Date,
    ) {
        return this.prisma.availabilityException.findMany({
            where: {
                therapistId,
                date: {
                    gte: startOfDay(startDate),
                    lte: endOfDay(endDate),
                },
            },
            orderBy: {
                date: 'asc',
            },
        });
    }

    /**
     * Generate available time slots for a specific date
     */
    async getAvailableSlots(
        therapistId: string,
        date: Date,
        sessionDuration: number, // in minutes
        patientTimezone: string,
    ) {
        const therapist = await this.prisma.therapistProfile.findUnique({
            where: { id: therapistId },
            include: {
                availability: true,
            },
        });

        if (!therapist) {
            throw new BadRequestException('Therapist not found');
        }

        const therapistTimezone = therapist.defaultTimezone;

        // Get day of week (0 = Sunday)
        const dayOfWeek = getDay(date);
        this.logger.debug(`Getting slots for therapist ${therapistId}, date: ${date}, dayOfWeek: ${dayOfWeek}`);

        // Get recurring availability for this day
        const recurringSlots = await this.getRecurringAvailability(therapistId, dayOfWeek);
        this.logger.debug(`Found ${recurringSlots.length} recurring slots for day ${dayOfWeek}`);

        if (recurringSlots.length === 0) {
            this.logger.warn(`No recurring availability found for therapist ${therapistId} on day ${dayOfWeek}`);
            return []; // No availability on this day
        }

        // Get exceptions for this date
        const exceptions = await this.getAvailabilityExceptions(
            therapistId,
            date,
            date,
        );

        // Get existing bookings for this date
        const bookings = await this.prisma.booking.findMany({
            where: {
                therapistId,
                startDateTime: {
                    gte: startOfDay(date),
                    lte: endOfDay(date),
                },
                status: {
                    in: ['PENDING_ACCEPTANCE', 'CONFIRMED', 'IN_PROGRESS'],
                },
            },
        });

        // Get buffer time from settings
        const bufferMinutes = 15; // TODO: Get from MarketplaceSettings

        // Generate slots
        const availableSlots: TimeSlot[] = [];

        for (const slot of recurringSlots) {
            // Parse start and end times
            const [startHour, startMin] = slot.startTime.split(':').map(Number);
            const [endHour, endMin] = slot.endTime.split(':').map(Number);

            // Create Date objects in therapist's timezone
            let slotStart = setMinutes(setHours(date, startHour), startMin);
            const slotEnd = setMinutes(setHours(date, endHour), endMin);

            // Generate slots with duration
            while (isBefore(addMinutes(slotStart, sessionDuration), slotEnd) ||
                addMinutes(slotStart, sessionDuration).getTime() === slotEnd.getTime()) {
                const slotEndTime = addMinutes(slotStart, sessionDuration);

                // Check if slot is blocked by exception
                const isBlocked = exceptions.some((ex) => {
                    if (ex.type === 'BLOCKED') {
                        if (!ex.startTime || !ex.endTime) {
                            // Entire day is blocked
                            return true;
                        }
                        // Check if slot overlaps with blocked time
                        const [exStartHour, exStartMin] = ex.startTime.split(':').map(Number);
                        const [exEndHour, exEndMin] = ex.endTime.split(':').map(Number);
                        const exStart = setMinutes(setHours(ex.date, exStartHour), exStartMin);
                        const exEnd = setMinutes(setHours(ex.date, exEndHour), exEndMin);

                        return (
                            isWithinInterval(slotStart, { start: exStart, end: exEnd }) ||
                            isWithinInterval(slotEndTime, { start: exStart, end: exEnd })
                        );
                    }
                    return false;
                });

                if (isBlocked) {
                    slotStart = addMinutes(slotStart, sessionDuration + bufferMinutes);
                    continue;
                }

                // Check if slot overlaps with existing booking
                const hasBooking = bookings.some((booking) => {
                    return (
                        isWithinInterval(slotStart, {
                            start: booking.startDateTime,
                            end: addMinutes(booking.endDateTime, bufferMinutes),
                        }) ||
                        isWithinInterval(slotEndTime, {
                            start: booking.startDateTime,
                            end: addMinutes(booking.endDateTime, bufferMinutes),
                        })
                    );
                });

                if (!hasBooking) {
                    availableSlots.push({
                        start: slotStart,
                        end: slotEndTime,
                    });
                }

                slotStart = addMinutes(slotStart, sessionDuration + bufferMinutes);
            }
        }

        // Handle "AVAILABLE" exceptions (extra availability)
        for (const exception of exceptions) {
            if (exception.type === 'AVAILABLE' && exception.startTime && exception.endTime) {
                const [startHour, startMin] = exception.startTime.split(':').map(Number);
                const [endHour, endMin] = exception.endTime.split(':').map(Number);

                let exStart = setMinutes(setHours(exception.date, startHour), startMin);
                const exEnd = setMinutes(setHours(exception.date, endHour), endMin);

                while (isBefore(addMinutes(exStart, sessionDuration), exEnd) ||
                    addMinutes(exStart, sessionDuration).getTime() === exEnd.getTime()) {
                    const exEndTime = addMinutes(exStart, sessionDuration);

                    // Check if this slot overlaps with existing slots
                    const alreadyAvailable = availableSlots.some((slot) =>
                        slot.start.getTime() === exStart.getTime(),
                    );

                    // Check if slot overlaps with booking
                    const hasBooking = bookings.some((booking) => {
                        return (
                            isWithinInterval(exStart, {
                                start: booking.startDateTime,
                                end: addMinutes(booking.endDateTime, bufferMinutes),
                            }) ||
                            isWithinInterval(exEndTime, {
                                start: booking.startDateTime,
                                end: addMinutes(booking.endDateTime, bufferMinutes),
                            })
                        );
                    });

                    if (!alreadyAvailable && !hasBooking) {
                        availableSlots.push({
                            start: exStart,
                            end: exEndTime,
                        });
                    }

                    exStart = addMinutes(exStart, sessionDuration + bufferMinutes);
                }
            }
        }

        // Sort slots by start time
        availableSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

        // Convert to patient's timezone for display
        return availableSlots.map((slot) => ({
            startTime: slot.start.toISOString(),
            endTime: slot.end.toISOString(),
            available: true,
            displayTime: this.formatSlotInTimezone(slot.start, slot.end, patientTimezone),
        }));
    }

    /**
     * Format slot time for display in a specific timezone
     */
    private formatSlotInTimezone(start: Date, end: Date, timezone: string): string {
        const startInTZ = toZonedTime(start, timezone);
        const endInTZ = toZonedTime(end, timezone);

        const startFormatted = format(startInTZ, 'h:mm a');
        const endFormatted = format(endInTZ, 'h:mm a zzz');

        return `${startFormatted} - ${endFormatted}`;
    }

    /**
     * Delete availability slot
     */
    async deleteAvailability(availabilityId: string, therapistId: string) {
        const availability = await this.prisma.therapistAvailability.findUnique({
            where: { id: availabilityId },
        });

        if (!availability || availability.therapistId !== therapistId) {
            throw new BadRequestException('Availability not found');
        }

        return this.prisma.therapistAvailability.update({
            where: { id: availabilityId },
            data: { isActive: false },
        });
    }

    /**
     * Delete availability exception
     */
    async deleteAvailabilityException(exceptionId: string, therapistId: string) {
        const exception = await this.prisma.availabilityException.findUnique({
            where: { id: exceptionId },
        });

        if (!exception || exception.therapistId !== therapistId) {
            throw new BadRequestException('Exception not found');
        }

        return this.prisma.availabilityException.delete({
            where: { id: exceptionId },
        });
    }

    /**
     * Get all availability for a therapist
     */
    async getTherapistAvailability(therapistId: string) {
        const [recurring, exceptions] = await Promise.all([
            this.prisma.therapistAvailability.findMany({
                where: { therapistId, isActive: true },
                orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
            }),
            this.prisma.availabilityException.findMany({
                where: { therapistId, date: { gte: new Date() } },
                orderBy: { date: 'asc' },
            }),
        ]);

        return { recurring, exceptions };
    }
}
