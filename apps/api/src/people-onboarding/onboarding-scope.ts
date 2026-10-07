import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Actor {
  id: string;
  role: string;
  email?: string;
  name?: string | null;
}

/** Where onboarded people land: the platform, or one organisation. */
export interface OnboardingScope {
  organizationId: string | null;
  organizationName: string | null;
}

export const isPlatformAdmin = (actor: Actor) => actor.role === 'ADMIN' || actor.role === 'SUPERADMIN';

@Injectable()
export class OnboardingScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Platform admin, optionally placing people into an organisation by id. */
  async platform(actor: Actor, organizationId?: string | null): Promise<OnboardingScope> {
    if (!isPlatformAdmin(actor)) throw new ForbiddenException('Platform admins only.');
    if (!organizationId) return { organizationId: null, organizationName: null };
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } });
    if (!org) throw new NotFoundException('Organization not found.');
    return { organizationId: org.id, organizationName: org.name };
  }

  /** An organisation's admin (or a platform admin) acting for that organisation. */
  async organization(actor: Actor, slug: string): Promise<OnboardingScope> {
    const org = await this.prisma.organization.findUnique({ where: { slug }, select: { id: true, name: true } });
    if (!org) throw new NotFoundException('Organization not found.');
    if (!isPlatformAdmin(actor)) {
      const member = await this.prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: actor.id, organizationId: org.id } },
        select: { role: true, status: true },
      });
      if (member?.role !== 'ADMIN' || member.status !== 'ACTIVE') {
        throw new ForbiddenException('Only this organization’s admins can do this.');
      }
    }
    return { organizationId: org.id, organizationName: org.name };
  }
}
