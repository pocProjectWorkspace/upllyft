import { Controller, Get, Post, Body, Session, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type express from 'express';
import { CaptchaService } from './captcha.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

const CAPTCHA_COOKIE = 'captcha_token';
const CAPTCHA_TTL_SECONDS = 300; // 5 minutes

/**
 * Legacy captcha endpoint (`/api/captcha/generate`). Kept for backwards
 * compatibility with existing clients (mobile app, older web pages). It
 * mirrors the behaviour of /api/auth/captcha/generate so multi-replica
 * deployments work correctly:
 *
 *   - Returns the captcha text encoded as a signed JWT in the body
 *     (`captchaToken`). New clients should echo this back when submitting
 *     the form.
 *   - Sets the same JWT in an HttpOnly cookie (`captcha_token`) for
 *     clients that don't read the body field.
 *   - Also keeps the legacy `session.captcha` string for the very oldest
 *     callers that look at session state.
 */
@ApiTags('captcha')
@Controller('captcha')
export class CaptchaController {
  constructor(
    private readonly captchaService: CaptchaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private signCaptchaToken(text: string): string {
    return this.jwtService.sign(
      { captcha: text, type: 'captcha' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: `${CAPTCHA_TTL_SECONDS}s`,
      },
    );
  }

  private captchaCookieOptions() {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      maxAge: CAPTCHA_TTL_SECONDS * 1000,
      path: '/',
    };
  }

  @Get('generate')
  generateCaptcha(
    @Session() session: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const { text, image } = this.captchaService.generateCaptcha();
    const captchaToken = this.signCaptchaToken(text);

    res.cookie(CAPTCHA_COOKIE, captchaToken, this.captchaCookieOptions());
    session.captcha = text;

    return {
      image,
      captchaToken,
      expiresIn: CAPTCHA_TTL_SECONDS * 1000,
    };
  }

  @Get('generate-math')
  generateMathCaptcha(
    @Session() session: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const { text, image } = this.captchaService.generateMathCaptcha();
    const captchaToken = this.signCaptchaToken(text);

    res.cookie(CAPTCHA_COOKIE, captchaToken, this.captchaCookieOptions());
    session.captcha = text;

    return {
      image,
      captchaToken,
      expiresIn: CAPTCHA_TTL_SECONDS * 1000,
    };
  }
}