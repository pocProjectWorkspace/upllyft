// apps/api/src/verification/verification.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Request,
  HttpStatus,
  HttpCode,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { VerificationService } from './verification.service';
import { Role, VerificationStatus } from '@prisma/client';
import {
  UploadDocumentsDto,
  UpdateVerificationStatusDto,
  GetVerificationQueueDto,
} from './dto/verification.dto';

@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('documents', 5, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Invalid file type. Only PDF, JPEG, and PNG are allowed.'), false);
      }
    },
  }))
  @HttpCode(HttpStatus.CREATED)
  async uploadDocuments(
    @Request() req: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadDocumentsDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const professionalRoles = [Role.THERAPIST, Role.EDUCATOR, Role.ORGANIZATION];
    if (!professionalRoles.includes(req.user.role)) {
      throw new ForbiddenException('Only professionals can upload verification documents');
    }

    return this.verificationService.uploadDocuments(req.user.id, files, dto);
  }

  @Get('my-documents')
  async getMyDocuments(@Request() req: any) {
    return this.verificationService.getUserDocuments(req.user.id);
  }

  @Get('status/:userId')
  async getUserVerificationStatus(@Param('userId') userId: string) {
    return this.verificationService.getUserVerificationStatus(userId);
  }

  // Admin endpoints
  @Get('queue')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  async getVerificationQueue(@Query() query: GetVerificationQueueDto) {
    return this.verificationService.getVerificationQueue(query);
  }

  @Get('document/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  async getDocument(@Param('id') id: string) {
    return this.verificationService.getDocument(id);
  }

  @Patch('document/:id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  async updateDocumentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateVerificationStatusDto,
    @Request() req: any,
  ) {
    return this.verificationService.updateDocumentStatus(id, dto, req.user.id);
  }

  @Patch('user/:userId/verify')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async verifyUser(
    @Param('userId') userId: string,
    @Body() dto: UpdateVerificationStatusDto,
    @Request() req: any,
  ) {
    return this.verificationService.verifyUser(userId, dto, req.user.id);
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getVerificationStats() {
    return this.verificationService.getVerificationStatistics();
  }
}
