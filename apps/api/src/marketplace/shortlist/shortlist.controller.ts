import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * A parent's saved providers. `POST` toggles (save ⇄ unsave) — the card's heart is one
 * button, so one endpoint. Everything is scoped to the caller; there is nothing to leak.
 */
@Controller('marketplace/shortlist')
@UseGuards(JwtAuthGuard)
export class ShortlistController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: any) {
    const entries = await this.prisma.shortlistEntry.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        therapist: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
        clinic: {
          include: { _count: { select: { therapists: true } } },
        },
      },
    });
    return { entries };
  }

  @Post()
  async toggle(
    @Req() req: any,
    @Body() body: { therapistId?: string; clinicId?: string },
  ) {
    const { therapistId, clinicId } = body ?? {};
    if ((!therapistId && !clinicId) || (therapistId && clinicId)) {
      throw new BadRequestException('Provide exactly one of therapistId or clinicId.');
    }

    const where = therapistId
      ? { userId: req.user.id, therapistId }
      : { userId: req.user.id, clinicId };

    const existing = await this.prisma.shortlistEntry.findFirst({ where });
    if (existing) {
      await this.prisma.shortlistEntry.delete({ where: { id: existing.id } });
      return { saved: false };
    }

    await this.prisma.shortlistEntry.create({
      data: { userId: req.user.id, therapistId: therapistId ?? null, clinicId: clinicId ?? null },
    });
    return { saved: true };
  }
}
