// src/providers/providers.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import {
  CreateProviderDto,
  UpdateProviderDto,
  ProviderFiltersDto,
} from './dto/provider.dto';

@Controller('providers')
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  /**
   * Get all providers with filters
   * Public endpoint - no auth required
   */
  @Get()
  async findAll(@Query() filters: ProviderFiltersDto) {
    return this.providersService.findAll(filters);
  }

  /**
   * Get provider statistics
   * Public endpoint
   */
  @Get('stats')
  async getStats() {
    return this.providersService.getStats();
  }

  /**
   * Get all unique states
   * Public endpoint
   */
  @Get('states')
  async getStates() {
    return this.providersService.getStates();
  }

  /**
   * Get cities for a state
   * Public endpoint
   */
  @Get('states/:state/cities')
  async getCities(@Param('state') state: string) {
    return this.providersService.getCities(state);
  }

  /**
   * Get all organization types
   * Public endpoint
   */
  @Get('organization-types')
  async getOrganizationTypes() {
    return this.providersService.getOrganizationTypes();
  }

  /**
   * Get provider by ID
   * Optional auth - tracks view if user is logged in
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.providersService.findOne(id, userId);
  }

  /**
   * Create new provider
   * Requires authentication
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateProviderDto, @Req() req: any) {
    return this.providersService.create(createDto, req.user.id);
  }

  /**
   * Update provider
   * Requires ADMIN or MODERATOR role
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProviderDto,
  ) {
    return this.providersService.update(id, updateDto);
  }

  /**
   * Delete provider
   * Requires ADMIN role
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.providersService.delete(id);
  }

  /**
   * Track contact click
   * Public endpoint for analytics
   */
  @Post(':id/contact-click')
  @HttpCode(HttpStatus.OK)
  async trackContactClick(@Param('id') id: string) {
    await this.providersService.trackContactClick(id);
    return { message: 'Contact click tracked' };
  }
}