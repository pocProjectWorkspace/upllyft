import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      // Fail loudly rather than verifying tokens against a guessable fallback,
      // which would let anyone forge a valid (e.g. admin) JWT.
      throw new Error(
        'JWT_SECRET is not set — refusing to start. Set JWT_SECRET in the environment.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException();
    }

    // clinicId/organizationId are signed into the token by AuthService.generateTokens.
    // They MUST be propagated: tenant-scoped services read req.user.clinicId, and a
    // missing value silently degrades those queries to unscoped (cross-tenant) reads.
    return {
      id: payload.sub,
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      verificationStatus: payload.verificationStatus,
      clinicId: payload.clinicId ?? null,
      organizationId: payload.organizationId ?? null,
    };
  }
}