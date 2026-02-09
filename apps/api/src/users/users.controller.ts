// apps/api/src/users/users.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserProfileDto } from './dto/update-profile.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // Get current user profile
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req: any) {
    return this.usersService.getProfileWithStats(req.user.id, req.user.id);
  }

  // Get current user's organizations
  @Get('me/organizations')
  @UseGuards(JwtAuthGuard)
  async getMyOrganizations(@Request() req: any) {
    return this.usersService.getUserOrganizations(req.user.id);
  }

  // Get user profile by ID
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserProfile(
    @Param('id') userId: string,
    @Request() req: any
  ) {
    return this.usersService.getProfileWithStats(userId, req.user.id);
  }

  // Update profile
  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateUserProfileDto
  ) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  // Upload avatar
  @Post('upload-avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new BadRequestException('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    })
  )
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const imageUrl = `/uploads/avatars/${file.filename}`;
    await this.usersService.updateAvatar(req.user.id, imageUrl);

    return { url: imageUrl, message: 'Avatar uploaded successfully' };
  }

  // Update avatar with Supabase URL (for cropped images uploaded to Supabase)
  @Put('avatar')
  @UseGuards(JwtAuthGuard)
  async updateAvatarUrl(
    @Request() req: any,
    @Body() body: { imageUrl: string }
  ) {
    if (!body.imageUrl) {
      throw new BadRequestException('Image URL is required');
    }

    // Validate that the URL is from Supabase storage or Google
    const isValidUrl = body.imageUrl.includes('supabase') ||
      body.imageUrl.includes('googleusercontent.com') ||
      body.imageUrl.includes('storage.googleapis.com');

    if (!isValidUrl) {
      throw new BadRequestException('Invalid image URL. Must be from Supabase storage or Google.');
    }

    await this.usersService.updateAvatar(req.user.id, body.imageUrl);

    return {
      url: body.imageUrl,
      message: 'Avatar updated successfully'
    };
  }

  // Follow a user
  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async followUser(
    @Param('id') targetUserId: string,
    @Request() req: any
  ) {
    if (req.user.id === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }
    return this.usersService.followUser(req.user.id, targetUserId);
  }

  // Unfollow a user
  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollowUser(
    @Param('id') targetUserId: string,
    @Request() req: any
  ) {
    await this.usersService.unfollowUser(req.user.id, targetUserId);
  }

  // Get user's followers
  @Get(':id/followers')
  async getFollowers(
    @Param('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.usersService.getFollowers(
      userId,
      parseInt(page),
      parseInt(limit)
    );
  }

  // Get user's following
  @Get(':id/following')
  async getFollowing(
    @Param('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.usersService.getFollowing(
      userId,
      parseInt(page),
      parseInt(limit)
    );
  }

  // Get user's contributions
  @Get(':id/contributions')
  async getUserContributions(
    @Param('id') userId: string,
    @Query('type') type?: 'posts' | 'answers' | 'resources'
  ) {
    return this.usersService.getUserContributions(userId, type);
  }

  // Get user's activity feed
  @Get(':id/activity')
  async getUserActivity(
    @Param('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.usersService.getUserActivity(
      userId,
      parseInt(page),
      parseInt(limit)
    );
  }

  // Get user's badges
  @Get(':id/badges')
  async getUserBadges(@Param('id') userId: string) {
    return this.usersService.getUserBadges(userId);
  }

  // Search users
  @Get('search')
  async searchUsers(
    @Query('q') query: string,
    @Query('role') role?: string,
    @Query('specialization') specialization?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.usersService.searchUsers({
      query,
      role,
      specialization,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }
}
