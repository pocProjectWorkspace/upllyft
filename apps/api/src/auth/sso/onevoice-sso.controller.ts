import {
  Controller,
  Get,
  Query,
  Res,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type express from 'express';
import {
  OneVoiceSsoService,
  SsoVerificationError,
} from './onevoice-sso.service';

@ApiTags('SSO')
@Controller('auth/sso')
export class OneVoiceSsoController {
  private readonly logger = new Logger(OneVoiceSsoController.name);

  constructor(
    private readonly ssoService: OneVoiceSsoService,
    private readonly configService: ConfigService,
  ) {}

  @Get('onevoice')
  @ApiOperation({ summary: 'OneVoice SSO login via JWT token' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with tokens or error page' })
  @ApiResponse({ status: 400, description: 'Missing token parameter' })
  async onevoiceSso(
    @Query('token') token: string,
    @Res({ passthrough: false }) res: express.Response,
  ) {
    if (!token) {
      throw new BadRequestException('Token query parameter is required');
    }

    try {
      const result = await this.ssoService.verifySsoAndLogin(token);

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';

      // Redirect to the existing callback page — same flow as Google OAuth
      const redirectUrl = `${frontendUrl}/callback?accessToken=${encodeURIComponent(result.accessToken)}&refreshToken=${encodeURIComponent(result.refreshToken)}`;

      this.logger.log(`SSO redirect for ${result.user.email} → frontend callback`);
      return res.redirect(redirectUrl);
    } catch (err) {
      if (err instanceof SsoVerificationError) {
        this.logger.warn(`SSO verification failed: ${err.code}`);
        const errorUrl = this.ssoService.getErrorRedirectUrl(err.code);
        return res.redirect(errorUrl);
      }

      this.logger.error(`Unexpected SSO error: ${err.message}`, err.stack);
      const errorUrl = this.ssoService.getErrorRedirectUrl('token_invalid');
      return res.redirect(errorUrl);
    }
  }
}
