import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChildClaimsModule } from '../child-claims/child-claims.module';
import { EmailModule } from '../email/email.module';
import { NurseryController } from './nursery.controller';
import { NurseryService } from './nursery.service';

@Module({
  imports: [PrismaModule, ChildClaimsModule, EmailModule],
  controllers: [NurseryController],
  providers: [NurseryService],
  exports: [NurseryService],
})
export class NurseryModule {}
