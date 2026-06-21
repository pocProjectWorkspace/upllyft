import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto, UpdateLeadStatusDto, ConvertLeadDto } from './dto/orchestration.dto';

/**
 * Phase 3 (UAE): enquiry/lead funnel — captures interest from any channel
 * before a patient record exists, and converts qualified leads into a Child.
 */
@Injectable()
export class LeadService {
  constructor(private prisma: PrismaService) {}

  list(clinicId: string, status?: LeadStatus) {
    return this.prisma.lead.findMany({
      where: { clinicId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateLeadDto) {
    const { clinicId, ...rest } = dto;
    return this.prisma.lead.create({ data: { clinicId, ...rest } });
  }

  async updateStatus(leadId: string, dto: UpdateLeadStatusDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: dto.status,
        closeReason: dto.closeReason,
        assignedToId: dto.assignedToId ?? lead.assignedToId,
        qualifiedAt: dto.status === LeadStatus.QUALIFIED && !lead.qualifiedAt ? new Date() : lead.qualifiedAt,
      },
    });
  }

  /** Convert a lead to an existing patient (Child), marking it CONVERTED. */
  async convert(leadId: string, dto: ConvertLeadDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.convertedChildId) throw new BadRequestException('Lead already converted');
    const child = await this.prisma.child.findUnique({ where: { id: dto.childId } });
    if (!child) throw new NotFoundException('Child not found');
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { status: LeadStatus.CONVERTED, convertedChildId: dto.childId },
    });
  }
}
