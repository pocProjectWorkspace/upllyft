import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, VerificationStatus } from '@prisma/client';

/** Claims embedded in a OneVoice SSO JWT. */
interface OneVoiceSsoClaims {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  name: string;
  role: string;
  jti: string;
  iat: number;
  exp: number;
  school_name?: string;
}

/** Error codes returned to OneVoice on failure. */
type SsoErrorCode =
  | 'token_expired'
  | 'token_invalid'
  | 'token_replayed'
  | 'claims_invalid'
  | 'user_suspended';

export class SsoVerificationError extends Error {
  constructor(public readonly code: SsoErrorCode) {
    super(`SSO verification failed: ${code}`);
    this.name = 'SsoVerificationError';
  }
}

@Injectable()
export class OneVoiceSsoService {
  private readonly logger = new Logger(OneVoiceSsoService.name);

  /**
   * In-memory jti store for replay prevention.
   * Map<jti, expiry timestamp in ms>
   * Cleaned up on every verification call.
   */
  private readonly usedJtis = new Map<string, number>();

  /** TTL for jti entries: 150 seconds (slightly longer than the 120s token validity). */
  private static readonly JTI_TTL_MS = 150_000;

  /** Clock skew tolerance: 30 seconds. */
  private static readonly CLOCK_SKEW_SECONDS = 30;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Full SSO flow: verify token → find/create user → generate Upllyft session tokens.
   * Returns { accessToken, refreshToken, user }.
   * Throws SsoVerificationError on any failure.
   */
  async verifySsoAndLogin(token: string) {
    const claims = this.verifyToken(token);
    this.checkReplay(claims.jti);

    const user = await this.findOrCreateUser(claims);
    await this.checkUserStatus(user.id);

    // Generate Upllyft tokens (same shape as normal login)
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    // Update last login timestamp (async, don't block)
    this.prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch((err) =>
        this.logger.warn(`Failed to update lastLoginAt: ${err.message}`),
      );

    this.logger.log(
      `SSO login successful for ${user.email} (OneVoice → ${user.role})`,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        verificationStatus: user.verificationStatus,
        avatar: user.image,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Token verification
  // ---------------------------------------------------------------------------

  private verifyToken(token: string): OneVoiceSsoClaims {
    const publicKey = this.configService.get<string>('ONEVOICE_SSO_PUBLIC_KEY');
    if (!publicKey) {
      this.logger.error('ONEVOICE_SSO_PUBLIC_KEY is not configured');
      throw new SsoVerificationError('token_invalid');
    }

    // Normalise the key: env vars may arrive with literal "\n" instead of real
    // newlines when loaded from .env files or hosting platforms.
    const normalizedKey = publicKey.replace(/\\n/g, '\n');

    let payload: OneVoiceSsoClaims;
    try {
      payload = jwt.verify(token, normalizedKey, {
        algorithms: ['RS256'],
        audience: 'upllyft',
        issuer: 'onevoice',
        clockTolerance: OneVoiceSsoService.CLOCK_SKEW_SECONDS,
      }) as OneVoiceSsoClaims;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new SsoVerificationError('token_expired');
      }
      if (
        err.name === 'JsonWebTokenError' &&
        err.message?.includes('audience')
      ) {
        throw new SsoVerificationError('claims_invalid');
      }
      if (
        err.name === 'JsonWebTokenError' &&
        err.message?.includes('issuer')
      ) {
        throw new SsoVerificationError('claims_invalid');
      }
      throw new SsoVerificationError('token_invalid');
    }

    // Validate required claims
    if (
      !payload.sub ||
      !payload.email ||
      !payload.name ||
      !payload.role ||
      !payload.jti
    ) {
      throw new SsoVerificationError('claims_invalid');
    }

    return payload;
  }

  // ---------------------------------------------------------------------------
  // Replay prevention
  // ---------------------------------------------------------------------------

  private checkReplay(jti: string): void {
    // Purge expired entries first
    const now = Date.now();
    for (const [id, expiresAt] of this.usedJtis) {
      if (expiresAt <= now) {
        this.usedJtis.delete(id);
      }
    }

    if (this.usedJtis.has(jti)) {
      throw new SsoVerificationError('token_replayed');
    }

    this.usedJtis.set(jti, now + OneVoiceSsoService.JTI_TTL_MS);
  }

  // ---------------------------------------------------------------------------
  // User find-or-create
  // ---------------------------------------------------------------------------

  private async findOrCreateUser(claims: OneVoiceSsoClaims) {
    const email = claims.email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      // Existing user — link source if not already set
      if (!user.ssoSource) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { ssoSource: 'onevoice' },
        });
      }
      return user;
    }

    // New user — auto-create
    const role = this.mapRole(claims.role);
    user = await this.prisma.user.create({
      data: {
        email,
        name: claims.name,
        role,
        password: null, // SSO-only, no password
        ssoSource: 'onevoice',
        verificationStatus:
          role === Role.USER
            ? VerificationStatus.VERIFIED
            : VerificationStatus.PENDING,
      },
    });

    this.logger.log(
      `Auto-created user ${email} via OneVoice SSO (role: ${role})`,
    );
    return user;
  }

  // ---------------------------------------------------------------------------
  // User status check (mirrors login/Google OAuth flow)
  // ---------------------------------------------------------------------------

  private async checkUserStatus(userId: string): Promise<void> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
    });

    if (memberships.length === 0) return;

    const allDeactivated = memberships.every(
      (m) => m.status === 'DEACTIVATED',
    );
    if (allDeactivated) {
      throw new SsoVerificationError('user_suspended');
    }

    const active = memberships.filter((m) => m.status !== 'DEACTIVATED');
    const allSuspended = active.length > 0 && active.every((m) => m.status === 'SUSPENDED');
    if (allSuspended) {
      throw new SsoVerificationError('user_suspended');
    }
  }

  // ---------------------------------------------------------------------------
  // Role mapping: OneVoice roles → Upllyft roles
  // ---------------------------------------------------------------------------

  private mapRole(oneVoiceRole: string): Role {
    switch (oneVoiceRole.toLowerCase()) {
      case 'parent':
        return Role.USER;
      case 'agent':
        return Role.EDUCATOR;
      case 'student':
        return Role.USER;
      default:
        return Role.USER;
    }
  }

  /** Build the OneVoice error redirect URL. */
  getErrorRedirectUrl(code: SsoErrorCode): string {
    const base =
      this.configService.get<string>('ONEVOICE_ERROR_REDIRECT_URL') ||
      'https://onevoice.sandbook.ai/helpdesk/sso-error';
    return `${base}?reason=${code}`;
  }
}
