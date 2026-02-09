// apps/api/src/config/multer.config.ts
import { ConfigService } from '@nestjs/config';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export const multerConfig = (configService: ConfigService): MulterOptions => ({
  storage: memoryStorage(),
  limits: {
    fileSize: configService.get<number>('MAX_FILE_SIZE', 10485760), // 10MB default
  },
});
