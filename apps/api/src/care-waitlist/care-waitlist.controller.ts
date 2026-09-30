import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsArray, IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CareWaitlistService } from './care-waitlist.service';

export class JoinWaitlistDto {
  @IsOptional()
  @IsString()
  childId?: string;

  /** ISO country code, e.g. AE / IN. */
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @IsOptional()
  @IsString()
  concern?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];
}

@Controller('care-waitlist')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CareWaitlistController {
  constructor(private readonly waitlist: CareWaitlistService) {}

  @Post()
  join(@Req() req: any, @Body() dto: JoinWaitlistDto) {
    return this.waitlist.join(req.user.id, dto);
  }

  @Get('me')
  mine(@Req() req: any) {
    return this.waitlist.mine(req.user.id);
  }

  /** Where families are waiting, by country and concern (platform admins). */
  @Get('demand')
  @Roles(Role.ADMIN)
  demand() {
    return this.waitlist.demand();
  }

  @Delete(':id')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.waitlist.cancel(req.user.id, id);
  }
}
