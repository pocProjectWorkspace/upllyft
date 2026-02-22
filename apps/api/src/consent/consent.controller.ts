import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { ConsentService } from './consent.service';
import { SendConsentDto } from './dto/send-consent.dto';

@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async sendConsent(@Body() dto: SendConsentDto, @Req() req: any) {
    return this.consentService.sendConsentForm(req.user.id, dto);
  }

  @Get('sign/:consentId')
  @UseGuards(JwtAuthGuard)
  async getSigningUrl(
    @Param('consentId') consentId: string,
    @Req() req: any,
  ) {
    return this.consentService.getSigningUrl(consentId, req.user.id);
  }

  @Get('patient/:patientId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'THERAPIST')
  async getPatientConsents(@Param('patientId') patientId: string) {
    return this.consentService.getPatientConsents(patientId);
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: any) {
    return this.consentService.handleWebhook(payload);
  }
}
