import { Module } from '@nestjs/common';
import { FcmTokenController } from './fcm-token.controller';
import { FcmTokenService } from './fcm-token.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [FcmTokenController],
    providers: [FcmTokenService],
    exports: [FcmTokenService],
})
export class FcmTokenModule { }
