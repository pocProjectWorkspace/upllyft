import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LegalAcceptanceService } from './legal-acceptance.service';

@ApiTags('legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legal: LegalAcceptanceService) {}

  /** Public: the current documents and checkbox wording (sign-up form). */
  @Get('documents')
  documents() {
    return { documents: this.legal.currentDocuments() };
  }

  /** What the signed-in user still has to accept. */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@Req() req: any) {
    return { pending: await this.legal.pending(req.user.id) };
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard)
  accept(@Req() req: Request & { user: { id: string } }, @Body() body: { accepted?: unknown }) {
    return this.legal.accept(req.user.id, body?.accepted as Array<{ type?: unknown; version?: unknown }>, {
      source: 'GATE',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
}
