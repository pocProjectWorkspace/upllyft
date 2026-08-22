import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { LibraryResourceScope, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface Actor {
  id: string;
  role: string;
}

/** Kept app-side (not a DB enum) so the list can evolve without a migration. */
export const RESOURCE_TYPES = [
  'GUIDE',
  'WORKSHEET',
  'VIDEO',
  'ARTICLE',
  'TEMPLATE',
  'OTHER',
] as const;

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
];
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const BUCKET = 'library-resources';

/**
 * Admin/org-uploaded library resources.
 *
 * VISIBILITY: PLATFORM resources are for everyone; ORGANIZATION resources only for that
 * org's members (any ACTIVE membership — the whole point is that org families see their
 * org's material). WRITE: platform scope needs ADMIN/SUPERADMIN; org scope needs an
 * ACTIVE org-ADMIN membership of that org. The bucket is public — these are published
 * materials by definition, never PHI.
 */
@Injectable()
export class LibraryResourcesService {
  private readonly logger = new Logger(LibraryResourcesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(
    actor: Actor,
    query: { resourceType?: string; tag?: string; search?: string; organizationId?: string },
  ) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: actor.id, status: 'ACTIVE' },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);

    const where: Prisma.LibraryResourceWhereInput = {
      AND: [
        query.organizationId
          ? // A single org's shelf (used by the org manage page) — must be a member.
            orgIds.includes(query.organizationId) || this.isPlatformAdmin(actor)
            ? { organizationId: query.organizationId }
            : { id: '__none__' }
          : {
              OR: [
                { scope: 'PLATFORM' },
                ...(orgIds.length ? [{ organizationId: { in: orgIds } }] : []),
              ],
            },
        ...(query.resourceType ? [{ resourceType: query.resourceType }] : []),
        ...(query.tag ? [{ tags: { has: query.tag } }] : []),
        ...(query.search
          ? [
              {
                OR: [
                  { title: { contains: query.search, mode: 'insensitive' as const } },
                  { description: { contains: query.search, mode: 'insensitive' as const } },
                ],
              },
            ]
          : []),
      ],
    };

    const resources = await this.prisma.libraryResource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    return { resources };
  }

  async create(
    actor: Actor,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined,
    body: {
      title?: string;
      description?: string;
      resourceType?: string;
      tags?: string;
      scope?: string;
      organizationId?: string;
    },
  ) {
    if (!file) throw new BadRequestException('A file is required.');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type. PDF, images, Word, PowerPoint and MP4 are allowed.');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('File too large — the limit is 50 MB.');
    }

    const title = body.title?.trim();
    if (!title) throw new BadRequestException('A title is required.');

    const resourceType = body.resourceType?.toUpperCase();
    if (!resourceType || !(RESOURCE_TYPES as readonly string[]).includes(resourceType)) {
      throw new BadRequestException(`resourceType must be one of ${RESOURCE_TYPES.join(', ')}.`);
    }

    const scope = body.scope === 'ORGANIZATION' ? 'ORGANIZATION' : 'PLATFORM';
    let organizationId: string | null = null;

    if (scope === 'PLATFORM') {
      if (!this.isPlatformAdmin(actor)) {
        throw new ForbiddenException('Only platform admins can publish platform-wide resources.');
      }
    } else {
      if (!body.organizationId) throw new BadRequestException('organizationId is required for org resources.');
      await this.assertOrgAdmin(actor, body.organizationId);
      organizationId = body.organizationId;
    }

    const tags = (body.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    const supabase = this.supabase();
    const safeName = file.originalname.replace(/[^\w.\-]+/g, '_');
    const path = `${scope === 'PLATFORM' ? 'platform' : organizationId}/${Date.now()}-${safeName}`;
    let { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error && /bucket not found/i.test(error.message)) {
      // First upload in a fresh environment — the bucket is created lazily so dev and
      // prod don't need a manual Supabase step. Public: these are published materials.
      await supabase.storage.createBucket(BUCKET, { public: true });
      ({ error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file.buffer, { contentType: file.mimetype, upsert: false }));
    }
    if (error) throw new BadRequestException(`Upload failed: ${error.message}`);

    const fileUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    const resource = await this.prisma.libraryResource.create({
      data: {
        title,
        description: body.description?.trim() || null,
        resourceType,
        tags,
        fileUrl,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        scope: scope as LibraryResourceScope,
        organizationId,
        uploadedById: actor.id,
      },
    });

    this.logger.log(`Library resource ${resource.id} uploaded (${scope}) by ${actor.id}`);
    return resource;
  }

  async remove(actor: Actor, id: string) {
    const resource = await this.prisma.libraryResource.findUnique({
      where: { id },
      select: { id: true, scope: true, organizationId: true, uploadedById: true },
    });
    if (!resource) throw new NotFoundException('Resource not found.');

    const mayDelete =
      resource.uploadedById === actor.id ||
      this.isPlatformAdmin(actor) ||
      (resource.organizationId
        ? await this.isOrgAdmin(actor, resource.organizationId)
        : false);
    if (!mayDelete) throw new ForbiddenException('You cannot remove this resource.');

    await this.prisma.libraryResource.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── internals ──────────────────────────────────────────────────────────────

  private isPlatformAdmin(actor: Actor) {
    return actor.role === 'ADMIN' || actor.role === 'SUPERADMIN';
  }

  private async isOrgAdmin(actor: Actor, organizationId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: actor.id, organizationId, status: 'ACTIVE', role: 'ADMIN' },
      select: { id: true },
    });
    return !!membership;
  }

  private async assertOrgAdmin(actor: Actor, organizationId: string) {
    if (this.isPlatformAdmin(actor)) return;
    if (!(await this.isOrgAdmin(actor, organizationId))) {
      throw new ForbiddenException('Only this organization’s admins can publish its resources.');
    }
  }

  private supabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new BadRequestException('Supabase is not configured.');
    return createClient(url, key);
  }
}
