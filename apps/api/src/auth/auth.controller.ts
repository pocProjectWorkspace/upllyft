// apps/api/src/auth/auth.controller.ts

import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Req,
  Res,
  Session,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type express from 'express';
import { AuthService } from './auth.service';

/**
 * Cookie name for the stateless captcha challenge. The cookie contains a
 * JWT signed with JWT_SECRET that encodes the captcha text. This works
 * across multiple Railway replicas because nothing is stored server-side
 * — the challenge travels with the request.
 */
const CAPTCHA_COOKIE = 'captcha_token';
const CAPTCHA_TTL_SECONDS = 300; // 5 minutes — same as the existing session captcha
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateAuthProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Sign a captcha challenge as a short-lived JWT so it can travel as a
   * cookie instead of relying on server-side session state. Required for
   * multi-replica deployments where in-memory sessions don't sync.
   */
  private signCaptchaToken(text: string): string {
    return this.jwtService.sign(
      { captcha: text, type: 'captcha' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: `${CAPTCHA_TTL_SECONDS}s`,
      },
    );
  }

  /** Verify a captcha JWT and return the original text, or null on failure. */
  private verifyCaptchaToken(token: string | undefined): string | null {
    if (!token) return null;
    try {
      const payload = this.jwtService.verify<{ captcha: string; type: string }>(
        token,
        { secret: this.configService.get<string>('JWT_SECRET') },
      );
      if (payload.type !== 'captcha') return null;
      return payload.captcha ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Resolve the expected captcha text. Tries three sources in order:
   *
   *   1. captchaToken in the request body — preferred. Eliminates cookie
   *      races entirely: the client receives the JWT in the captcha/generate
   *      response body and echoes it back when submitting the form.
   *   2. captcha_token cookie — fallback for clients that haven't been
   *      updated yet. Multi-replica safe (the cookie travels with the request).
   *   3. session.captcha — legacy fallback for single-replica/dev. Will not
   *      work reliably across multiple Railway replicas.
   *
   * Returns null if none of the three paths yields a verified captcha.
   */
  private getExpectedCaptcha(
    req: any,
    session: any,
    bodyToken?: string | null,
  ): string | null {
    const fromBody = this.verifyCaptchaToken(bodyToken ?? undefined);
    if (fromBody) return fromBody;

    const fromCookie = this.verifyCaptchaToken(req.cookies?.[CAPTCHA_COOKIE]);
    if (fromCookie) return fromCookie;

    if (session?.captcha) {
      if (typeof session.captcha === 'string') return session.captcha;
      if (typeof session.captcha === 'object' && typeof session.captcha.text === 'string') {
        return session.captcha.text;
      }
    }
    return null;
  }

  /** Standard cookie attributes for the captcha challenge cookie. */
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

  @Post('register')
  @ApiOperation({ summary: 'Register a new user with captcha validation' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid captcha or validation error' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body() registerDto: RegisterDto,
    @Session() session: any,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    // Prefer captchaToken from request body (eliminates cookie races),
    // fall back to cookie (multi-replica safe), then session (legacy).
    const expectedCaptcha = this.getExpectedCaptcha(
      req,
      session,
      registerDto.captchaToken,
    );
    if (!expectedCaptcha) {
      throw new BadRequestException('Captcha not found. Please generate a new captcha.');
    }

    // Call service with captcha validation
    const result = await this.authService.register(registerDto, expectedCaptcha);

    // Clear both stores after successful registration so the challenge
    // can't be replayed.
    delete session.captcha;
    res.clearCookie(CAPTCHA_COOKIE, { path: '/' });

    return {
      ...result,
      message: 'Registration successful',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // ✅ Google OAuth - Step 1: Initiate OAuth flow
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  async googleAuth(@Res({ passthrough: false }) res: express.Response) {
    // Guard will trigger Passport to redirect to Google
    // No code needed here - Passport handles it
  }

  // ✅ Google OAuth - Step 2: Handle callback from Google
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(
    @Req() req: any,
    @Res({ passthrough: false }) res: express.Response,
  ) {
    console.log(`[AuthController] 🔵 Callback reached. req.user: ${req.user ? 'FOUND' : 'MISSING'}`);
    try {
      this.logger.log('Google callback received');
      if (req.user) {
        this.logger.debug(`Google user data: ${JSON.stringify(req.user.email)}`);
      }

      if (!req.user) {
        console.error('[AuthController] 🆘 No user data from Google');
        this.logger.error('No user data from Google');
        throw new Error('No user from Google auth');
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // Check for suspended/deactivated memberships BEFORE generating tokens
      const fullProfile = await this.authService.getProfile(req.user.id);
      const memberships = fullProfile.organizationMemberships || [];

      this.logger.debug(`Checking memberships for Google user: ${memberships.length}`);

      const suspendedMemberships = memberships.filter(
        (m: any) => m.status === 'SUSPENDED'
      );
      const deactivatedMemberships = memberships.filter(
        (m: any) => m.status === 'DEACTIVATED'
      );

      // If ALL memberships are deactivated, redirect to account status page
      if (memberships.length > 0 && deactivatedMemberships.length === memberships.length) {
        this.logger.warn('All memberships DEACTIVATED - blocking Google login');
        const orgsParam = deactivatedMemberships.map((m: any) => m.organization?.name).filter(Boolean).join(',');
        return res.redirect(`${frontendUrl}/account-status?status=deactivated&organizations=${encodeURIComponent(orgsParam)}`);
      }

      // If ALL non-deactivated memberships are suspended, redirect to account status page
      const activeMemberships = memberships.filter(
        (m: any) => m.status !== 'DEACTIVATED'
      );
      if (activeMemberships.length > 0 && activeMemberships.every((m: any) => m.status === 'SUSPENDED')) {
        this.logger.warn('All active memberships SUSPENDED - blocking Google login');
        const orgsParam = suspendedMemberships.map((m: any) => m.organization?.name).filter(Boolean).join(',');
        return res.redirect(`${frontendUrl}/account-status?status=suspended&organizations=${encodeURIComponent(orgsParam)}`);
      }

      // Generate JWT tokens for the user
      const tokens = await this.authService.googleLogin(req.user);
      this.logger.log('Tokens generated successfully');

      // Check if this is a mobile redirect (state param carries the mobile redirect URI)
      const mobileRedirectUri = req.query.state as string | undefined;
      if (mobileRedirectUri && mobileRedirectUri.startsWith('upllyft://')) {
        this.logger.log('Redirecting to mobile app');
        const redirectUrl = `${mobileRedirectUri}?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
        return res.redirect(redirectUrl);
      }

      // Redirect to frontend with tokens
      const redirectUrl = `${frontendUrl}/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

      this.logger.log('Redirecting to frontend');
      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error(`Google auth error: ${error.message}`, error.stack);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }

  // Google OAuth for mobile - exchange Google ID token for JWT tokens
  @Post('google/mobile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange Google ID token for JWT tokens (mobile)' })
  @ApiResponse({ status: 200, description: 'Tokens generated' })
  @ApiResponse({ status: 401, description: 'Invalid Google ID token' })
  async googleMobileAuth(@Body() body: { idToken: string }) {
    if (!body.idToken) {
      throw new BadRequestException('idToken is required');
    }
    return this.authService.googleLoginWithIdToken(body.idToken);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateAuthProfileDto,
  ) {
    return this.authService.updateProfile(req.user.id, updateProfileDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid old password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  // ==========================================
  // CAPTCHA & PASSWORD RESET ENDPOINTS
  // ==========================================

  @Get('captcha/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate captcha for registration/password reset' })
  @ApiResponse({ status: 200, description: 'Captcha generated successfully' })
  async generateCaptcha(
    @Session() session: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    try {
      const captcha = await this.authService.generateCaptcha();
      const captchaToken = this.signCaptchaToken(captcha.text);

      // Primary path: return the JWT token in the response body so the
      // client can echo it back when submitting. This eliminates ALL the
      // cookie race conditions where a second captcha generation could
      // overwrite the first one's cookie before the form submits.
      // Also cookie-based path (multi-replica safe) and session-based path
      // (legacy) are kept as fallbacks.
      res.cookie(CAPTCHA_COOKIE, captchaToken, this.captchaCookieOptions());
      session.captcha = {
        text: captcha.text,
        generatedAt: Date.now(),
      };

      return {
        image: captcha.image,
        captchaToken, // ← NEW: clients should echo this back in the form body
        expiresIn: CAPTCHA_TTL_SECONDS * 1000,
      };
    } catch (error) {
      this.logger.error('Failed to generate captcha', error);
      throw new BadRequestException('Failed to generate captcha');
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiResponse({ status: 400, description: 'Invalid captcha or email' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Session() session: any,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    try {
      this.logger.debug(`Forgot password request for: ${forgotPasswordDto.email}`);

      // Validate captcha in DTO
      if (!forgotPasswordDto.captcha) {
        this.logger.warn('Captcha missing in request body');
        throw new BadRequestException('Captcha is required');
      }

      // Prefer captchaToken from the body (eliminates cookie races), then
      // fall back to cookie (multi-replica safe), then session (legacy).
      const expectedCaptcha = this.getExpectedCaptcha(
        req,
        session,
        forgotPasswordDto.captchaToken,
      );
      if (!expectedCaptcha) {
        this.logger.warn('Captcha not found in body, cookie or session');
        throw new BadRequestException('Captcha not found. Please generate a new captcha.');
      }

      const isValidCaptcha =
        expectedCaptcha.toLowerCase() === forgotPasswordDto.captcha.toLowerCase().trim();

      if (!isValidCaptcha) {
        throw new BadRequestException('Invalid captcha');
      }

      // Clear both captcha stores so the challenge can't be replayed
      delete session.captcha;
      res.clearCookie(CAPTCHA_COOKIE, { path: '/' });

      return await this.authService.forgotPassword(forgotPasswordDto.email);
    } catch (error) {
      this.logger.error(`Forgot password error: ${error.message}`);
      throw error;
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  @Post('verify-reset-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify password reset token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyResetToken(@Body() body: { token: string }) {
    return this.authService.verifyResetToken(body.token);
  }

  // ==========================================
  // SECURITY & LOGOUT ENDPOINTS
  // ==========================================

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Request() req: any,
    @Body('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    // Note: deliberately NOT guarded by JwtAuthGuard. Logout must succeed
    // even if the access token is expired or missing — otherwise users
    // get stuck "logged in" client-side because their attempt to clean
    // up server-side state fails with 401.

    // Best-effort revoke the refresh token if provided
    if (refreshToken && req.user?.id) {
      try {
        await this.authService.revokeRefreshToken(req.user.id, refreshToken);
      } catch (err) {
        this.logger.warn(`Refresh token revoke failed during logout: ${err.message}`);
      }
    }

    // Destroy the Express session (if any). This kills server-side passport
    // state so a stale session cookie can't re-attach a user identity to
    // subsequent requests.
    if (req.session && typeof req.session.destroy === 'function') {
      await new Promise<void>((resolve) => {
        req.session.destroy(() => resolve());
      });
    }

    // Clear cookies the backend owns (session, captcha challenge).
    // Frontend-set tokens (upllyft_access_token / upllyft_refresh_token)
    // live on the .safehaven-upllyft.com parent domain — the API can't
    // clear those itself, the frontend's clearStoredTokens() handles it.
    res.clearCookie('session', { path: '/' });
    res.clearCookie(CAPTCHA_COOKIE, { path: '/' });

    return {
      message: 'Logged out successfully',
      success: true,
    };
  }

  @Post('revoke-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke refresh token (logout)' })
  @ApiResponse({ status: 200, description: 'Token revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeToken(@Request() req: any, @Body('refreshToken') refreshToken: string) {
    try {
      await this.authService.revokeRefreshToken(req.user.id, refreshToken);
      return {
        message: 'Token revoked successfully',
        success: true,
      };
    } catch (error) {
      throw new BadRequestException('Failed to revoke token');
    }
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@Request() req: any) {
    try {
      await this.authService.revokeAllRefreshTokens(req.user.id);
      return {
        message: 'Logged out from all devices successfully',
        success: true,
      };
    } catch (error) {
      throw new BadRequestException('Failed to logout from all devices');
    }
  }
}
