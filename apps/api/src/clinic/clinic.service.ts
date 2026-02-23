import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateClinicTherapistDto, UpdateTherapistScheduleDto } from './dto/clinic.dto';

@Injectable()
export class ClinicService {
    constructor(private readonly prisma: PrismaService) { }

    async getClinicByAdminId(adminId: string) {
        return this.prisma.clinic.findUnique({
            where: { adminId },
            include: {
                admin: { select: { id: true, name: true, email: true, image: true } },
                therapists: {
                    include: {
                        user: { select: { id: true, name: true, email: true, image: true, specialization: true } },
                    },
                    orderBy: { user: { name: 'asc' } },
                },
            },
        });
    }

    async updateClinic(adminId: string, data: any) {
        return this.prisma.clinic.update({
            where: { adminId },
            data,
        });
    }

    async getClinicTherapists(adminId: string) {
        const clinic = await this.prisma.clinic.findUnique({ where: { adminId } });
        if (!clinic) return [];

        const profiles = await this.prisma.therapistProfile.findMany({
            where: { clinicId: clinic.id, isActive: true },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        image: true,
                        specialization: true,
                    },
                },
                availability: true,
                sessionTypes: true,
            },
            orderBy: { user: { name: 'asc' } },
        });

        return profiles.map((p) => ({
            id: p.user.id,
            profileId: p.id,
            name: p.user.name,
            email: p.user.email,
            phone: p.user.phone,
            avatar: p.user.image,
            specializations: p.specializations,
            title: p.title,
            isActive: p.isActive,
            acceptingBookings: p.acceptingBookings,
            sessionTypes: p.sessionTypes,
            availabilityCount: p.availability.length,
        }));
    }

    async createClinicTherapist(adminId: string, dto: CreateClinicTherapistDto) {
        const clinic = await this.prisma.clinic.findUnique({ where: { adminId } });
        if (!clinic) throw new NotFoundException('Clinic not found for this admin');

        // Create the user account
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                name: dto.name,
                phone: dto.phone,
                role: Role.THERAPIST,
                specialization: dto.specializations,
                isEmailVerified: false,
            },
        });

        // Create the therapist profile linked to the clinic
        const profile = await this.prisma.therapistProfile.create({
            data: {
                userId: user.id,
                title: dto.title,
                specializations: dto.specializations,
                clinicId: clinic.id,
                isActive: true,
                acceptingBookings: true,
                credentialStatus: 'PENDING',
            },
        });

        return {
            id: user.id,
            profileId: profile.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            specializations: profile.specializations,
            title: profile.title,
            clinicId: clinic.id,
        };
    }

    async updateTherapistSchedule(
        therapistUserId: string,
        dto: UpdateTherapistScheduleDto,
        adminId: string,
    ) {
        const clinic = await this.prisma.clinic.findUnique({ where: { adminId } });
        if (!clinic) throw new NotFoundException('Clinic not found');

        const profile = await this.prisma.therapistProfile.findUnique({
            where: { userId: therapistUserId },
        });
        if (!profile || profile.clinicId !== clinic.id) {
            throw new NotFoundException('Therapist not found in this clinic');
        }

        // Delete existing availability for this therapist
        await this.prisma.therapistAvailability.deleteMany({
            where: { therapistId: profile.id },
        });

        // Re-create with new schedule
        if (dto.availability && dto.availability.length > 0) {
            await this.prisma.therapistAvailability.createMany({
                data: dto.availability.map((slot) => ({
                    therapistId: profile.id,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isActive: true,
                })),
            });
        }

        return { success: true, therapistId: therapistUserId, slotsSet: dto.availability?.length ?? 0 };
    }
}
