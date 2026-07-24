import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PublicIntakeService } from './public-intake.service';

/**
 * Public, unauthenticated Parent Intake endpoints — deliberately NO JwtAuthGuard.
 * The global ThrottlerGuard still rate-limits; access is the per-case token.
 */
@Controller('public/intake')
export class PublicIntakeController {
  constructor(private readonly service: PublicIntakeService) {}

  @Get(':token')
  getAccess(@Param('token') token: string) {
    return this.service.getAccess(token);
  }

  @Post(':token')
  submit(@Param('token') token: string, @Body() body: any) {
    return this.service.submit(token, body);
  }
}
