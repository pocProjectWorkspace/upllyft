import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { grantConsent, revokeConsent } from '../common/consent';

export class GrantChildConsentDto {
  @IsString()
  childId: string;

  @IsString()
  facilityId: string;

  @IsEnum(ConsentType)
  type: ConsentType;

  @IsOptional()
  @IsString()
  purpose?: string;
}

/**
 * GUARDIAN-facing consent. This is the endpoint through which a parent actually
 * agrees — and the reason we never seed consent on a family's behalf.
 *
 * Everything else in the system CAPTURES consent (intake Section E, DocuSign
 * e-sign). Those are staff-mediated. This is the family speaking for themselves,
 * and it is the only path that can create a grant for a facility a parent has never
 * met — which is exactly the nursery case.
 */
@ApiTags('consent')
@Controller('child-consent')
@UseGuards(JwtAuthGuard)
export class ChildConsentController {
  constructor(private readonly prisma: PrismaService) {}

  /** Every facility affiliated to my child, and what I have (or have not) granted. */
  @Get('child/:childId')
  @ApiOperation({ summary: "A guardian's consent state for their child, per facility" })
  async getForChild(@Param('childId') childId: string, @Req() req: any) {
    await this.assertGuardian(childId, req.user.id);

    const affiliations = await this.prisma.childAffiliation.findMany({
      where: { childId, status: 'ACTIVE', endedAt: null },
      select: {
        facilityId: true,
        type: true,
        dataScope: true,
        facility: { select: { name: true, type: true } },
      },
    });

    const consents = await this.prisma.childConsent.findMany({
      where: { childId, revokedAt: null },
      select: { facilityId: true, type: true, validUntil: true, createdAt: true },
    });

    return affiliations.map((a) => ({
      facilityId: a.facilityId,
      facilityName: a.facility.name,
      facilityType: a.facility.type,
      relationship: a.type,
      dataScope: a.dataScope,
      granted: consents
        .filter((c) => c.facilityId === a.facilityId)
        .map((c) => ({ type: c.type, since: c.createdAt, until: c.validUntil })),
    }));
  }

  @Post('grant')
  @ApiOperation({ summary: 'Guardian grants a facility consent for their child' })
  async grant(@Body() dto: GrantChildConsentDto, @Req() req: any) {
    await this.assertGuardian(dto.childId, req.user.id);

    // You cannot consent to a facility your child has no relationship with.
    const affiliation = await this.prisma.childAffiliation.findFirst({
      where: { childId: dto.childId, facilityId: dto.facilityId, endedAt: null },
      select: { id: true },
    });
    if (!affiliation) {
      throw new NotFoundException('Your child is not affiliated with that facility.');
    }

    return grantConsent(this.prisma, {
      childId: dto.childId,
      facilityId: dto.facilityId,
      type: dto.type,
      purpose: dto.purpose ?? 'Granted by guardian',
      grantedByUserId: req.user.id,
    });
  }

  /** Revocation must bite immediately — the gate re-checks on every access. */
  @Delete('grant/:childId/:facilityId/:type')
  @ApiOperation({ summary: 'Guardian revokes a consent' })
  async revoke(
    @Param('childId') childId: string,
    @Param('facilityId') facilityId: string,
    @Param('type') type: ConsentType,
    @Req() req: any,
  ) {
    await this.assertGuardian(childId, req.user.id);
    const revoked = await revokeConsent(this.prisma, childId, facilityId, type);
    return { revoked };
  }

  /**
   * Only a guardian may speak for a child. Platform admins are deliberately NOT
   * allowed through: consent is the one thing an operator cannot give on a family's
   * behalf.
   */
  private async assertGuardian(childId: string, userId: string): Promise<void> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { profile: { select: { userId: true } } },
    });
    if (!child) throw new NotFoundException('Child not found');

    if (child.profile?.userId === userId) return;

    const guardian = await this.prisma.guardian.findFirst({
      where: { childId, userId, hasAuthorityToConsent: true },
      select: { id: true },
    });
    if (guardian) return;

    throw new ForbiddenException(
      'Only a guardian with authority to consent may do this. Consent cannot be given on a family’s behalf.',
    );
  }
}
