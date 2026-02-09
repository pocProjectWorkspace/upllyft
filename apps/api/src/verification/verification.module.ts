
// apps/api/src/verification/verification.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { multerConfig } from '../config/multer.config';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: multerConfig,
      inject: [ConfigService],
    }),
  ],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}