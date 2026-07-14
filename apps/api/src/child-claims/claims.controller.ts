import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClaimsService } from './claims.service';
import { AcceptClaimDto, DisputeClaimDto } from './dto/claims.dto';

/**
 * GUARDIAN-facing. The token in the path IS the credential, so `preview` and
 * `dispute` are deliberately UNAUTHENTICATED:
 *
 *   - preview  — you cannot decide whether to sign up until you can see who is
 *                asking and why. Minimised accordingly (see ClaimsService.preview).
 *   - dispute  — requiring someone to create an account before they can say "that
 *                is not my child" would mean they never say it, and we would keep
 *                the affiliation.
 *
 * `candidates` and `accept` DO require auth: they move a child record between
 * profiles, so we must know whose profile.
 */
@ApiTags('child-claims')
@Controller('child-claims')
export class ClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  @Get(':token')
  @ApiOperation({ summary: 'What is this link? (unauthenticated, minimised)' })
  preview(@Param('token') token: string) {
    return this.claims.preview(token);
  }

  @Get(':token/candidates')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Your existing children, to match against this one' })
  candidates(@Param('token') token: string, @Req() req: any) {
    return this.claims.candidates(token, req.user.id);
  }

  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Claim the child — adopt the placeholder, or merge into your existing child',
  })
  accept(@Param('token') token: string, @Body() dto: AcceptClaimDto, @Req() req: any) {
    return this.claims.accept(token, req.user.id, dto.existingChildId);
  }

  @Post(':token/dispute')
  @ApiOperation({ summary: 'This is not my child (unauthenticated by design)' })
  dispute(@Param('token') token: string, @Body() dto: DisputeClaimDto) {
    return this.claims.dispute(token, dto.reason);
  }
}
