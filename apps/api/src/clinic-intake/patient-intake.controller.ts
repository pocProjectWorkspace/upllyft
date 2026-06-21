import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GuardianService } from './guardian.service';
import { IdentityService } from './identity.service';
import { PreVisitTaskService } from './pre-visit-task.service';
import {
  CreateGuardianDto,
  UpdateGuardianDto,
  CaptureIdentityDto,
  CreatePreVisitTaskDto,
  UpdatePreVisitTaskDto,
} from './dto/clinic-intake.dto';

@Controller('children/:childId')
@UseGuards(JwtAuthGuard)
export class PatientIntakeController {
  constructor(
    private guardians: GuardianService,
    private identity: IdentityService,
    private preVisitTasks: PreVisitTaskService,
  ) {}

  // ── Guardians ──
  @Get('guardians')
  listGuardians(@Param('childId') childId: string) {
    return this.guardians.list(childId);
  }

  @Post('guardians')
  createGuardian(@Param('childId') childId: string, @Body() dto: CreateGuardianDto) {
    return this.guardians.create(childId, dto);
  }

  @Put('guardians/:guardianId')
  updateGuardian(
    @Param('childId') childId: string,
    @Param('guardianId') guardianId: string,
    @Body() dto: UpdateGuardianDto,
  ) {
    return this.guardians.update(childId, guardianId, dto);
  }

  @Delete('guardians/:guardianId')
  removeGuardian(@Param('childId') childId: string, @Param('guardianId') guardianId: string) {
    return this.guardians.remove(childId, guardianId);
  }

  // ── Identity ──
  @Get('identity')
  getIdentity(@Param('childId') childId: string) {
    return this.identity.getMaskedIdentity(childId);
  }

  @Put('identity')
  captureIdentity(
    @Param('childId') childId: string,
    @Body() dto: CaptureIdentityDto,
    @Req() req: any,
  ) {
    return this.identity.capture(childId, req.user.id, dto);
  }

  @Post('identity/verify')
  verifyIdentity(@Param('childId') childId: string, @Req() req: any) {
    return this.identity.verify(childId, req.user.id);
  }

  // ── Pre-visit tasks ──
  @Get('pre-visit-tasks')
  listTasks(@Param('childId') childId: string) {
    return this.preVisitTasks.list(childId);
  }

  @Post('pre-visit-tasks')
  createTask(@Param('childId') childId: string, @Body() dto: CreatePreVisitTaskDto) {
    return this.preVisitTasks.create(childId, dto);
  }

  @Patch('pre-visit-tasks/:taskId')
  updateTask(
    @Param('childId') childId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdatePreVisitTaskDto,
  ) {
    return this.preVisitTasks.updateStatus(childId, taskId, dto);
  }
}
