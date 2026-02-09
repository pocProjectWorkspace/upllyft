// apps/api/src/auth/guards/verified.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';

@Injectable()
export class VerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Account verification required');
    }

    return true;
  }
}