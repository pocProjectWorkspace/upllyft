// apps/api/src/user/user-preferences.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Request,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserPreferencesService } from './user-preferences.service';
import { UserPreferencesDto } from '../users/dto/user-preferences.dto';

@Controller('user')
export class UserPreferencesController {
  constructor(
    private readonly preferencesService: UserPreferencesService,
  ) {}

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  async getPreferences(@Request() req) {
    try {
      const preferences = await this.preferencesService.getPreferences(req.user.id);
      return preferences;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch preferences',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('preferences')
  @UseGuards(JwtAuthGuard)
  async savePreferences(
    @Request() req,
    @Body() preferencesDto: UserPreferencesDto,
  ) {
    try {
      const preferences = await this.preferencesService.savePreferences(
        req.user.id,
        preferencesDto,
      );
      return preferences;
    } catch (error) {
      throw new HttpException(
        'Failed to save preferences',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('preferences/reset')
  @UseGuards(JwtAuthGuard)
  async resetPreferences(@Request() req) {
    try {
      await this.preferencesService.resetPreferences(req.user.id);
      return { message: 'Preferences reset successfully' };
    } catch (error) {
      throw new HttpException(
        'Failed to reset preferences',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}