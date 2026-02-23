import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { BannerAdsService } from './banner-ads.service';
import { CreateBannerAdDto } from './dto/create-banner-ad.dto';
import { UpdateBannerAdDto } from './dto/update-banner-ad.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role, AdPlacement, AdStatus } from '@prisma/client';

@Controller('banner-ads')
export class BannerAdsController {
  constructor(private readonly bannerAdsService: BannerAdsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateBannerAdDto, @Request() req) {
    return this.bannerAdsService.create(dto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: AdStatus,
    @Query('placement') placement?: AdPlacement,
    @Query('search') search?: string,
  ) {
    return this.bannerAdsService.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
      placement,
      search,
    });
  }

  @Get('active/:placement')
  async getActiveByPlacement(@Param('placement') placement: AdPlacement) {
    return this.bannerAdsService.getActiveByPlacement(placement);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  async findOne(@Param('id') id: string) {
    return this.bannerAdsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateBannerAdDto) {
    return this.bannerAdsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.bannerAdsService.remove(id);
  }

  @Post(':id/impression')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(204)
  async trackImpression(@Param('id') id: string, @Request() req) {
    await this.bannerAdsService.trackEvent(
      id,
      'impression',
      req.user?.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post(':id/click')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(204)
  async trackClick(@Param('id') id: string, @Request() req) {
    await this.bannerAdsService.trackEvent(
      id,
      'click',
      req.user?.id,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
