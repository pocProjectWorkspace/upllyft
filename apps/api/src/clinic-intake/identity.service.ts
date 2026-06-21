import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { CaptureIdentityDto } from './dto/clinic-intake.dto';

/**
 * Phase 1 (UAE): patient identity capture. Emirates ID / passport are encrypted
 * at the app layer before storage and returned masked. Identity documents are
 * stored as restricted, audited references.
 */
@Injectable()
export class IdentityService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  async capture(childId: string, userId: string, dto: CaptureIdentityDto) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');

    await this.prisma.child.update({
      where: { id: childId },
      data: {
        identityType: dto.identityType,
        emiratesId: dto.emiratesId ? this.encryption.encrypt(dto.emiratesId) : undefined,
        emiratesIdExpiry: dto.emiratesIdExpiry ? new Date(dto.emiratesIdExpiry) : undefined,
        passportNumber: dto.passportNumber ? this.encryption.encrypt(dto.passportNumber) : undefined,
      },
    });

    if (dto.documentFileUrl) {
      await this.prisma.patientIdentityDocument.create({
        data: {
          childId,
          type: dto.identityType,
          fileUrl: dto.documentFileUrl,
          uploadedById: userId,
        },
      });
    }

    return this.getMaskedIdentity(childId);
  }

  async verify(childId: string, userId: string) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');
    await this.prisma.child.update({
      where: { id: childId },
      data: { identityVerified: true, identityVerifiedAt: new Date(), identityVerifiedBy: userId },
    });
    return this.getMaskedIdentity(childId);
  }

  /** Returns identity status with masked numbers — never the plaintext PHI. */
  async getMaskedIdentity(childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: {
        identityType: true,
        emiratesId: true,
        emiratesIdExpiry: true,
        passportNumber: true,
        identityVerified: true,
        identityVerifiedAt: true,
      },
    });
    if (!child) throw new NotFoundException('Child not found');
    return {
      identityType: child.identityType,
      emiratesIdMasked: child.emiratesId ? this.encryption.mask(this.encryption.decrypt(child.emiratesId)) : null,
      emiratesIdExpiry: child.emiratesIdExpiry,
      passportMasked: child.passportNumber ? this.encryption.mask(this.encryption.decrypt(child.passportNumber)) : null,
      identityVerified: child.identityVerified,
      identityVerifiedAt: child.identityVerifiedAt,
    };
  }
}
