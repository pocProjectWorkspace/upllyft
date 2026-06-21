import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PayerService } from './payer.service';
import {
  CreateInsurancePolicyDto,
  UpdateInsurancePolicyDto,
  CreatePreAuthorizationDto,
  DecidePreAuthorizationDto,
  RenewPreAuthorizationDto,
  SetBookingClearanceDto,
} from './dto/payer.dto';

@Controller('children/:childId/insurance-policies')
@UseGuards(JwtAuthGuard)
export class InsurancePolicyController {
  constructor(private payer: PayerService) {}

  @Get()
  list(@Param('childId') childId: string) {
    return this.payer.listPolicies(childId);
  }

  @Post()
  create(@Param('childId') childId: string, @Body() dto: CreateInsurancePolicyDto) {
    return this.payer.createPolicy(childId, dto);
  }

  @Patch(':policyId')
  update(
    @Param('childId') childId: string,
    @Param('policyId') policyId: string,
    @Body() dto: UpdateInsurancePolicyDto,
  ) {
    return this.payer.updatePolicy(childId, policyId, dto);
  }
}

@Controller('pre-authorizations')
@UseGuards(JwtAuthGuard)
export class PreAuthorizationController {
  constructor(private payer: PayerService) {}

  @Get()
  list(@Query('caseId') caseId?: string) {
    return this.payer.listPreAuths(caseId);
  }

  @Post()
  create(@Body() dto: CreatePreAuthorizationDto) {
    return this.payer.createPreAuth(dto);
  }

  @Patch(':id/decision')
  decide(@Param('id') id: string, @Body() dto: DecidePreAuthorizationDto) {
    return this.payer.decidePreAuth(id, dto);
  }

  @Post(':id/renew')
  renew(@Param('id') id: string, @Body() dto: RenewPreAuthorizationDto) {
    return this.payer.renewPreAuth(id, dto);
  }
}

@Controller('bookings/:bookingId')
@UseGuards(JwtAuthGuard)
export class BookingClearanceController {
  constructor(private payer: PayerService) {}

  @Get('readiness')
  readiness(@Param('bookingId') bookingId: string) {
    return this.payer.getBookingReadiness(bookingId);
  }

  @Patch('clearance')
  setClearance(
    @Param('bookingId') bookingId: string,
    @Body() dto: SetBookingClearanceDto,
    @Req() req: any,
  ) {
    return this.payer.setBookingClearance(bookingId, req.user.id, dto);
  }
}
