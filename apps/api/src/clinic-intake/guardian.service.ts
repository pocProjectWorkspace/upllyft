import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuardianDto, UpdateGuardianDto } from './dto/clinic-intake.dto';

@Injectable()
export class GuardianService {
  constructor(private prisma: PrismaService) {}

  private async assertChild(childId: string) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');
  }

  async list(childId: string) {
    await this.assertChild(childId);
    return this.prisma.guardian.findMany({
      where: { childId },
      orderBy: [{ isPrimaryContact: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(childId: string, dto: CreateGuardianDto) {
    await this.assertChild(childId);
    return this.prisma.guardian.create({
      data: { childId, ...dto },
    });
  }

  async update(childId: string, guardianId: string, dto: UpdateGuardianDto) {
    const guardian = await this.prisma.guardian.findFirst({ where: { id: guardianId, childId } });
    if (!guardian) throw new NotFoundException('Guardian not found');
    return this.prisma.guardian.update({ where: { id: guardianId }, data: dto });
  }

  async remove(childId: string, guardianId: string) {
    const guardian = await this.prisma.guardian.findFirst({ where: { id: guardianId, childId } });
    if (!guardian) throw new NotFoundException('Guardian not found');
    await this.prisma.guardian.delete({ where: { id: guardianId } });
    return { success: true };
  }
}
