import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';

/**
 * The parent claim — shared by every surface that can create a child on a
 * guardian's behalf: the nursery roster and the clinic walk-in today, anything
 * else tomorrow.
 *
 * It lives in its own module rather than inside `nursery` precisely because
 * `clinic-patients` needs it too, and a clinic importing NurseryModule to create a
 * walk-in would be nonsense.
 */
@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [ClaimsController],
  providers: [ClaimsService],
  exports: [ClaimsService],
})
export class ChildClaimsModule {}
