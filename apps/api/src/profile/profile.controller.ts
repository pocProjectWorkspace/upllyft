// apps/api/src/profile/profile.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddChildDto, UpdateChildDto } from './dto/add-child.dto';
import { AddChildConditionDto, UpdateChildConditionDto } from './dto/add-child-condition.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  private readonly logger = new Logger(ProfileController.name);

  constructor(private readonly profileService: ProfileService) { }

  // ============================================
  // PROFILE ENDPOINTS
  // ============================================

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProfile(@Request() req) {
    this.logger.log(`Getting profile for user: ${req.user.id}`);
    return this.profileService.getProfile(req.user.id);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getProfile(@Param('userId') userId: string) {
    this.logger.log(`Getting profile for user: ${userId}`);
    return this.profileService.getProfile(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMyProfile(@Request() req, @Body() updateData: UpdateProfileDto) {
    this.logger.log(`Updating profile for user: ${req.user.id}`);
    return this.profileService.updateProfile(req.user.id, updateData);
  }

  @Post('me')
  @ApiOperation({ summary: 'Create or update current user profile' })
  @ApiResponse({ status: 201, description: 'Profile created/updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createOrUpdateProfile(@Request() req, @Body() profileData: CreateProfileDto) {
    this.logger.log(`Creating/updating profile for user: ${req.user.id}`);
    return this.profileService.updateProfile(req.user.id, profileData);
  }

  // ============================================
  // CHILD ENDPOINTS
  // ============================================

  @Post('child')
  @ApiOperation({ summary: 'Add a child to profile' })
  @ApiResponse({ status: 201, description: 'Child added successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addChild(@Request() req, @Body() childData: AddChildDto) {
    this.logger.log(`Adding child for user: ${req.user.id}`);
    return this.profileService.addChild(req.user.id, childData);
  }

  @Put('child/:childId')
  @ApiOperation({ summary: 'Update child information' })
  @ApiParam({ name: 'childId', description: 'Child ID' })
  @ApiResponse({ status: 200, description: 'Child updated successfully' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateChild(
    @Request() req,
    @Param('childId') childId: string,
    @Body() updateData: UpdateChildDto,
  ) {
    this.logger.log(`Updating child ${childId} for user: ${req.user.id}`);
    return this.profileService.updateChild(req.user.id, childId, updateData);
  }

  @Delete('child/:childId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a child' })
  @ApiParam({ name: 'childId', description: 'Child ID' })
  @ApiResponse({ status: 204, description: 'Child deleted successfully' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteChild(@Request() req, @Param('childId') childId: string) {
    this.logger.log(`Deleting child ${childId} for user: ${req.user.id}`);
    return this.profileService.deleteChild(req.user.id, childId);
  }

  // ============================================
  // CHILD CONDITION ENDPOINTS
  // ============================================

  @Post('child/condition')
  @ApiOperation({ summary: 'Add condition to a child' })
  @ApiResponse({ status: 201, description: 'Condition added successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addChildCondition(
    @Request() req,
    @Body() conditionData: AddChildConditionDto,
  ) {
    this.logger.log(`Adding condition to child ${conditionData.childId}`);
    return this.profileService.addChildCondition(req.user.id, conditionData);
  }

  @Put('child/condition/:conditionId')
  @ApiOperation({ summary: 'Update child condition' })
  @ApiParam({ name: 'conditionId', description: 'Condition ID' })
  @ApiResponse({ status: 200, description: 'Condition updated successfully' })
  @ApiResponse({ status: 404, description: 'Condition not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateChildCondition(
    @Request() req,
    @Param('conditionId') conditionId: string,
    @Body() updateData: UpdateChildConditionDto,
  ) {
    this.logger.log(`Updating condition ${conditionId} for user: ${req.user.id}`);
    return this.profileService.updateChildCondition(
      req.user.id,
      conditionId,
      updateData,
    );
  }

  @Delete('child/condition/:conditionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete child condition' })
  @ApiParam({ name: 'conditionId', description: 'Condition ID' })
  @ApiResponse({ status: 204, description: 'Condition deleted successfully' })
  @ApiResponse({ status: 404, description: 'Condition not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteChildCondition(
    @Request() req,
    @Param('conditionId') conditionId: string,
  ) {
    this.logger.log(`Deleting condition ${conditionId} for user: ${req.user.id}`);
    return this.profileService.deleteChildCondition(req.user.id, conditionId);
  }

  // ============================================
  // COMPLETENESS ENDPOINTS
  // ============================================

  @Get('completeness/me')
  @ApiOperation({ summary: 'Get profile completeness breakdown' })
  @ApiResponse({
    status: 200,
    description: 'Completeness breakdown retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyCompleteness(@Request() req) {
    this.logger.log(`Getting completeness for user: ${req.user.id}`);
    return this.profileService.getCompletenessBreakdown(req.user.id);
  }

  @Post('completeness/recalculate')
  @ApiOperation({ summary: 'Recalculate profile completeness score' })
  @ApiResponse({ status: 200, description: 'Score recalculated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async recalculateCompleteness(@Request() req) {
    this.logger.log(`Recalculating completeness for user: ${req.user.id}`);
    const score = await this.profileService.updateCompletenessScore(req.user.id);
    return {
      score,
      message: 'Completeness score recalculated successfully',
    };
  }

  // ============================================
  // ONBOARDING ENDPOINTS
  // ============================================

  @Post('onboarding/complete')
  @ApiOperation({ summary: 'Mark onboarding as complete' })
  @ApiResponse({ status: 200, description: 'Onboarding completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completeOnboarding(@Request() req) {
    this.logger.log(`Completing onboarding for user: ${req.user.id}`);
    return this.profileService.completeOnboarding(req.user.id);
  }

  @Get('onboarding/status')
  @ApiOperation({ summary: 'Check if user needs onboarding' })
  @ApiResponse({ status: 200, description: 'Onboarding status retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOnboardingStatus(@Request() req) {
    this.logger.log(`Checking onboarding status for user: ${req.user.id}`);
    const needsOnboarding = await this.profileService.needsOnboarding(
      req.user.id,
    );
    return {
      needsOnboarding,
      userId: req.user.id,
    };
  }
}