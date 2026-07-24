import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { IntakeState, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CaptchaService } from '../captcha/captcha.service';

/**
 * Public (unauthenticated) Parent Intake. A parent opens a secure link, fills the
 * intake form, and their submission lands as a PENDING DRAFT on the case's
 * CaseIntake — the clinician later reviews/summarises it. Auth is the unguessable
 * per-case token (SHA-256 stored, time-limited); a captcha blunts abuse; the global
 * ThrottlerGuard rate-limits. No existing PHI is read back — only the child's first
 * name, to personalise the form.
 */
@Injectable()
export class PublicIntakeService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private captcha: CaptchaService,
  ) {}

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async findCaseByToken(rawToken: string) {
    if (!rawToken) throw new NotFoundException('This intake link is invalid.');
    const c = await this.prisma.case.findFirst({
      where: { intakeTokenHash: this.hash(rawToken) },
      select: {
        id: true,
        intakeTokenExpiry: true,
        primaryTherapist: { select: { userId: true } },
        child: { select: { firstName: true } },
      },
    });
    if (!c) throw new NotFoundException('This intake link is invalid.');
    if (!c.intakeTokenExpiry || c.intakeTokenExpiry.getTime() < Date.now()) {
      throw new BadRequestException('This intake link has expired. Ask the clinic for a new one.');
    }
    return c;
  }

  /** Validate the link and hand back a fresh captcha challenge. */
  async getAccess(rawToken: string) {
    const c = await this.findCaseByToken(rawToken);
    const { text, image } = this.captcha.generateCaptcha();
    const captchaToken = this.jwt.sign({ type: 'intake-captcha', captcha: text }, { expiresIn: '10m' });
    return { childFirstName: c.child?.firstName ?? null, captcha: { image, captchaToken } };
  }

  /** Verify captcha + token, then upsert the intake as a pending draft. */
  async submit(rawToken: string, dto: any) {
    let expected: string | null = null;
    try {
      const payload = this.jwt.verify(dto?.captchaToken);
      if (payload?.type === 'intake-captcha') expected = payload.captcha;
    } catch {
      /* fall through to the incorrect-captcha error */
    }
    const answer = String(dto?.captchaAnswer ?? '').trim().toUpperCase();
    if (!expected || answer !== String(expected).trim().toUpperCase()) {
      throw new BadRequestException('Captcha incorrect. Please try again.');
    }

    const c = await this.findCaseByToken(rawToken);
    const createdById = c.primaryTherapist?.userId;
    if (!createdById) throw new BadRequestException('This case is not ready to accept intake yet.');

    const base = {
      state: IntakeState.DRAFT,
      data: (dto?.data ?? {}) as Prisma.InputJsonValue,
      presentingConcern: dto?.presentingConcern ?? undefined,
      referralQuestions: Array.isArray(dto?.referralQuestions) ? dto.referralQuestions : [],
      parentGoals: Array.isArray(dto?.parentGoals) ? dto.parentGoals : [],
      consentAssessment: !!dto?.consentAssessment,
      consentTherapy: !!dto?.consentTherapy,
      consentSharing: !!dto?.consentSharing,
      consentAi: !!dto?.consentAi,
    };

    await this.prisma.caseIntake.upsert({
      where: { caseId: c.id },
      create: { caseId: c.id, createdById, ...base },
      update: { ...base },
    });

    return { success: true };
  }
}
