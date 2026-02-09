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
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type express from 'express';
import { AuthService } from './auth.service';
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
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user with captcha validation' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid captcha or validation error' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body() registerDto: RegisterDto,
    @Session() session: any,
  ) {
    // ✅ Validate session has captcha
    if (!session.captcha) {
      throw new BadRequestException('Captcha not found. Please generate a new captcha.');
    }

    // ✅ Call service with captcha validation
    const result = await this.authService.register(registerDto, session.captcha);

    // ✅ Clear captcha from session after successful registration
    delete session.captcha;

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
    try {
      console.log('🔵 Google callback received');
      console.log('🔵 req.user:', req.user);

      if (!req.user) {
        console.error('❌ No user data from Google');
        throw new Error('No user from Google auth');
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // Check for suspended/deactivated memberships BEFORE generating tokens
      const fullProfile = await this.authService.getProfile(req.user.id);
      const memberships = fullProfile.organizationMemberships || [];

      console.log('🔍 Checking memberships for Google user:', memberships.length);

      const suspendedMemberships = memberships.filter(
        (m: any) => m.status === 'SUSPENDED'
      );
      const deactivatedMemberships = memberships.filter(
        (m: any) => m.status === 'DEACTIVATED'
      );

      // If ALL memberships are deactivated, redirect to account status page
      if (memberships.length > 0 && deactivatedMemberships.length === memberships.length) {
        console.log('❌ All memberships DEACTIVATED - blocking Google login');
        const orgsParam = deactivatedMemberships.map((m: any) => m.organization?.name).filter(Boolean).join(',');
        return res.redirect(`${frontendUrl}/account-status?status=deactivated&organizations=${encodeURIComponent(orgsParam)}`);
      }

      // If ALL non-deactivated memberships are suspended, redirect to account status page
      const activeMemberships = memberships.filter(
        (m: any) => m.status !== 'DEACTIVATED'
      );
      if (activeMemberships.length > 0 && activeMemberships.every((m: any) => m.status === 'SUSPENDED')) {
        console.log('❌ All active memberships SUSPENDED - blocking Google login');
        const orgsParam = suspendedMemberships.map((m: any) => m.organization?.name).filter(Boolean).join(',');
        return res.redirect(`${frontendUrl}/account-status?status=suspended&organizations=${encodeURIComponent(orgsParam)}`);
      }

      // Generate JWT tokens for the user
      const tokens = await this.authService.googleLogin(req.user);
      console.log('✅ Tokens generated successfully');

      // Check if this is a mobile redirect (state param carries the mobile redirect URI)
      const mobileRedirectUri = req.query.state as string | undefined;
      if (mobileRedirectUri && mobileRedirectUri.startsWith('upllyft://')) {
        const redirectUrl = `${mobileRedirectUri}?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
        console.log('✅ Redirecting to mobile:', redirectUrl);
        return res.redirect(redirectUrl);
      }

      // Redirect to frontend with tokens
      const redirectUrl = `${frontendUrl}/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

      console.log('✅ Redirecting to:', redirectUrl);
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Google auth error:', error.message);
      console.error('❌ Stack:', error.stack);

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
    return req.user;
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
  async generateCaptcha(@Session() session: any) {
    try {
      const captcha = await this.authService.generateCaptcha();

      // Store captcha in session with timestamp for expiration
      session.captcha = {
        text: captcha.text,
        generatedAt: Date.now(),
      };

      return {
        image: captcha.image,
        expiresIn: 300000, // 5 minutes in milliseconds
      };
    } catch (error) {
      console.error('Generate captcha error:', error);
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
  ) {
    try {
      console.log('🔵 Forgot Password Request:', {
        email: forgotPasswordDto.email,
        captchaProvided: !!forgotPasswordDto.captcha,
        sessionCaptchaExists: !!session?.captcha
      });

      // Validate session exists
      if (!session) {
        console.error('❌ Session is undefined');
        throw new BadRequestException('Session initialization failed. Please refresh the page.');
      }

      // Validate captcha object in session
      if (!session.captcha) {
        console.error('❌ Captcha not found in session');
        throw new BadRequestException('Captcha not found. Please generate a new captcha.');
      }

      // Handle both string and object formats for captcha
      let sessionCaptchaText: string;

      if (typeof session.captcha === 'string') {
        sessionCaptchaText = session.captcha;
      } else if (typeof session.captcha === 'object' && session.captcha.text) {
        sessionCaptchaText = session.captcha.text;
      } else {
        console.error('❌ Invalid captcha format in session:', session.captcha);
        throw new BadRequestException('Captcha invalid. Please generate a new captcha.');
      }

      // Validate captcha in DTO
      if (!forgotPasswordDto.captcha) {
        console.error('❌ Captcha missing in request body');
        throw new BadRequestException('Captcha is required');
      }

      const normalizedSessionCaptcha = sessionCaptchaText.toLowerCase();
      const normalizedUserCaptcha = forgotPasswordDto.captcha.toLowerCase().trim();

      console.log(`🔍 Verifying Captcha: Session='${normalizedSessionCaptcha}', User='${normalizedUserCaptcha}'`);

      const isValidCaptcha = normalizedSessionCaptcha === normalizedUserCaptcha;

      if (!isValidCaptcha) {
        throw new BadRequestException('Invalid captcha');
      }

      // Clear captcha from session
      delete session.captcha;

      return await this.authService.forgotPassword(forgotPasswordDto.email);
    } catch (error) {
      console.error('❌ Forgot Password Controller Error:', error);
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
