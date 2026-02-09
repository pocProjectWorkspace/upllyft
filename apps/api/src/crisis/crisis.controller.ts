// apps/api/src/crisis/crisis.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CrisisService } from './crisis.service';
import { CrisisResourcesService } from './crisis-resources.service';
import { CrisisVolunteerService } from './crisis-volunteer.service';
import { CrisisDetectionService } from './crisis-detection.service';
import {
  CreateCrisisIncidentDto,
  UpdateCrisisIncidentDto,
  CreateCrisisResourceDto,
  GetResourcesQueryDto,
  VolunteerRegistrationDto,
  UpdateVolunteerAvailabilityDto,
  CreateConnectionDto,
  UpdateConnectionDto,
} from './dto';

@ApiTags('Crisis Management')
@Controller('crisis')
export class CrisisController {
  constructor(
    private readonly crisisService: CrisisService,
    private readonly resourcesService: CrisisResourcesService,
    private readonly volunteerService: CrisisVolunteerService,
    private readonly detectionService: CrisisDetectionService,
  ) {}

  // ============ INCIDENT ENDPOINTS ============

  @Post('incident')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a crisis incident' })
  @ApiResponse({ status: 201, description: 'Incident created successfully' })
  async createIncident(@Request() req: any, @Body() dto: CreateCrisisIncidentDto) {
    // Add IP and user agent from request
    dto.ipAddress = req.ip;
    dto.userAgent = req.headers['user-agent'];
    
    return this.crisisService.createIncident(req.user.id, dto);
  }

  @Get('incident/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get incident details' })
  async getIncident(@Request() req: any, @Param('id') id: string) {
    return this.crisisService.getIncident(id, req.user.id);
  }

  @Patch('incident/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update incident status' })
  async updateIncident(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCrisisIncidentDto
  ) {
    return this.crisisService.updateIncident(id, dto, req.user.id);
  }

  @Get('incidents/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user crisis history' })
  async getMyIncidents(@Request() req: any, @Query('limit') limit?: string) {
    return this.crisisService.getUserIncidents(req.user.id, limit ? parseInt(limit) : 10);
  }

  // ============ RESOURCE ENDPOINTS ============

  @Get('resources')
  @ApiOperation({ summary: 'Search crisis resources' })
  async searchResources(@Query() query: GetResourcesQueryDto) {
    return this.resourcesService.searchResources(query);
  }

  @Get('resources/emergency')
  @ApiOperation({ summary: 'Get emergency contacts' })
  async getEmergencyContacts() {
    return this.resourcesService.getEmergencyContacts();
  }

  @Get('resources/national')
  @ApiOperation({ summary: 'Get national helplines' })
  async getNationalResources(@Query('type') type?: string) {
    const crisisType = type ? (type as any) : undefined;
    return this.resourcesService.getNationalResources(crisisType);
  }

  @Get('resources/:id')
  @ApiOperation({ summary: 'Get resource details' })
  async getResource(@Param('id') id: string) {
    return this.resourcesService.getResourceById(id);
  }

  @Post('resources')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Add new resource (Admin)' })
  async createResource(@Body() dto: CreateCrisisResourceDto) {
    return this.resourcesService.createResource(dto);
  }

  @Put('resources/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Verify resource (Admin)' })
  async verifyResource(@Request() req: any, @Param('id') id: string) {
    return this.resourcesService.verifyResource(id, req.user.id);
  }

  @Get('resources/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Get resource statistics (Admin)' })
  async getResourceStats() {
    return this.resourcesService.getResourceStats();
  }

  // ============ VOLUNTEER ENDPOINTS ============

  @Post('volunteer/register')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Register as crisis volunteer' })
  async registerVolunteer(@Request() req: any, @Body() dto: VolunteerRegistrationDto) {
    return this.volunteerService.registerVolunteer(req.user.id, dto);
  }

  @Get('volunteer/profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get volunteer profile' })
  async getVolunteerProfile(@Request() req: any) {
    return this.volunteerService.getVolunteerProfile(req.user.id);
  }

  @Patch('volunteer/availability')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update volunteer availability' })
  async updateAvailability(@Request() req: any, @Body() dto: UpdateVolunteerAvailabilityDto) {
    return this.volunteerService.updateAvailability(req.user.id, dto);
  }

  @Post('volunteer/training-complete')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark training as complete' })
  async completeTraining(
    @Request() req: any,
    @Body() body: { certificateIds: string[] }
  ) {
    return this.volunteerService.completeTraining(req.user.id, body.certificateIds);
  }

  @Get('volunteers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Get all volunteers (Admin)' })
  async getAllVolunteers(
    @Query('isActive') isActive?: string,
    @Query('isAvailable') isAvailable?: string,
    @Query('state') state?: string,
    @Query('specialization') specialization?: string,
  ) {
    return this.volunteerService.getAllVolunteers({
      isActive: isActive ? isActive === 'true' : undefined,
      isAvailable: isAvailable ? isAvailable === 'true' : undefined,
      state,
      specialization: specialization as any,
    });
  }

  @Put('volunteer/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve volunteer (Admin)' })
  async approveVolunteer(@Request() req: any, @Param('id') id: string) {
    return this.volunteerService.approveVolunteer(id, req.user.id);
  }

  // ============ CONNECTION ENDPOINTS ============

  @Post('connection')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create connection to resource/volunteer' })
  async createConnection(@Body() dto: CreateConnectionDto) {
    return this.crisisService.createConnection(dto);
  }

  @Patch('connection/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update connection outcome' })
  async updateConnection(
    @Param('id') id: string,
    @Body() dto: UpdateConnectionDto
  ) {
    return this.crisisService.updateConnection(id, dto);
  }

  // ============ DETECTION ENDPOINTS ============

  @Post('detect')
  @ApiOperation({ summary: 'Detect crisis keywords in content' })
  @HttpCode(HttpStatus.OK)
  async detectCrisis(@Body() body: { content: string }) {
    if (!body.content) {
      throw new BadRequestException('Content is required');
    }
    return this.detectionService.detectCrisisInContent(body.content);
  }

  @Post('analyze-pattern')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Analyze conversation pattern for crisis' })
  async analyzePattern(@Body() body: { messages: { content: string; timestamp: Date }[] }) {
    return this.detectionService.analyzeConversationPattern(body.messages);
  }

  // ============ ADMIN ENDPOINTS ============

  @Post('resources/bulk-import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk import resources (Admin)' })
  async bulkImportResources(@Body() resources: CreateCrisisResourceDto[]) {
    return this.resourcesService.bulkImportResources(resources);
  }

  @Post('follow-ups/check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Check and process follow-ups (Admin)' })
  async checkFollowUps() {
    const count = await this.crisisService.checkFollowUps();
    return { 
      message: `Processed ${count} follow-ups`,
      count 
    };
  }
}