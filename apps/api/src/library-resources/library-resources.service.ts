import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { LibraryResourceScope, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseDomains } from '../resource-journey/domains';

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

/** Who sees a resource. ORGS = the organizations in `audienceOrgs`. */
export const AUDIENCES = ['EVERYONE', 'ALL_ORGS', 'ORGS'] as const;
/** Narrows the audience by account type. FAMILIES = role USER, STAFF = any other role. */
export const AUDIENCE_SEGMENTS = ['ALL', 'FAMILIES', 'STAFF'] as const;

type Audience = (typeof AUDIENCES)[number];
type AudienceSegment = (typeof AUDIENCE_SEGMENTS)[number];

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
/** Types the browser can show inline — the only ones that can be view-only. */
const VIEWABLE_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TARGET_ORGS = 100;
const BUCKET = 'library-resources';
/** Signed links outlive the client's 30-minute query cache. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const RESOURCE_INCLUDE = {
  organization: { select: { id: true, name: true } },
  uploadedBy: { select: { id: true, name: true } },
  audienceOrgs: { select: { organization: { select: { id: true, name: true } } } },
} satisfies Prisma.LibraryResourceInclude;

type ResourceRow = Prisma.LibraryResourceGetPayload<{ include: typeof RESOURCE_INCLUDE }>;

/** Family-facing tags shown on Resources-journey cards. Multipart sends strings. */
export interface JourneyTagsInput {
  /** Area keys, comma-separated or an array. */
  domains?: string | string[];
  ageMin?: string | number | null;
  ageMax?: string | number | null;
  durationMinutes?: string | number | null;
  practises?: string | null;
  forText?: string | null;
}

interface AudienceInput {
  audience?: string;
  organizationIds?: string | string[];
  audienceSegment?: string;
  downloadable?: string | boolean;
}

/**
 * Admin/org-uploaded library resources.
 *
 * OWNERSHIP (`scope`): PLATFORM resources are managed by platform admins; ORGANIZATION
 * resources by that org's admins (and platform admins).
 *
 * VISIBILITY (`audience` × `audienceSegment`): EVERYONE, ALL_ORGS (anyone attached to an
 * organization), or ORGS (the targeted organizations), optionally narrowed to FAMILIES or
 * STAFF. A user is ATTACHED to an organization by an ACTIVE membership, or — for
 * families — by a child with an ACTIVE affiliation to one of its facilities. Org admins
 * publish to their own organization; only platform admins can share an org resource
 * more widely (the owning organization always keeps access).
 *
 * FILES are served by short-lived signed URLs, never the bucket's public URL, so being
 * out of the audience means not being able to open the file either (once the bucket is
 * private — see scripts/make-library-bucket-private.mjs). `downloadable: false` (org
 * resources only) withholds the download link; it is a deterrent, not DRM.
 */
@Injectable()
export class LibraryResourcesService {
  private readonly logger = new Logger(LibraryResourcesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(
    actor: Actor,
    query: {
      resourceType?: string;
      tag?: string;
      search?: string;
      organizationId?: string;
      scope?: string;
    },
  ) {
    const scope =
      query.scope === 'PLATFORM' || query.scope === 'ORGANIZATION'
        ? (query.scope as LibraryResourceScope)
        : undefined;
    const platformAdmin = this.isPlatformAdmin(actor);

    // Management views list a shelf whole, regardless of audience; everyone else gets
    // only what is aimed at them.
    let base: Prisma.LibraryResourceWhereInput;
    let manage = false;
    if (query.organizationId) {
      manage = platformAdmin || (await this.isOrgAdmin(actor, query.organizationId));
      base = manage
        ? { organizationId: query.organizationId }
        : { AND: [{ organizationId: query.organizationId }, await this.visibleTo(actor)] };
    } else if (scope && platformAdmin) {
      manage = true;
      base = { scope };
    } else {
      base = { AND: [await this.visibleTo(actor), ...(scope ? [{ scope }] : [])] };
    }

    const where: Prisma.LibraryResourceWhereInput = {
      AND: [
        base,
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

    const rows = await this.prisma.libraryResource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: RESOURCE_INCLUDE,
    });

    return { resources: await this.present(rows, manage) };
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
    } & AudienceInput &
      JourneyTagsInput,
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
    const resourceType = this.parseResourceType(body.resourceType);

    const scope: LibraryResourceScope = body.scope === 'ORGANIZATION' ? 'ORGANIZATION' : 'PLATFORM';
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

    // Validate the audience BEFORE the upload, so a bad request never leaves an orphan file.
    const audience = await this.resolveAudience(
      actor,
      { scope, organizationId, mimeType: file.mimetype },
      body,
    );

    const supabase = this.supabase();
    const safeName = file.originalname.replace(/[^\w.\-]+/g, '_');
    const path = `${scope === 'PLATFORM' ? 'platform' : organizationId}/${Date.now()}-${safeName}`;
    let { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error && /bucket not found/i.test(error.message)) {
      // First upload in a fresh environment — the bucket is created lazily so dev and
      // prod don't need a manual Supabase step. Private: files go out as signed URLs.
      await supabase.storage.createBucket(BUCKET, { public: false });
      ({ error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file.buffer, { contentType: file.mimetype, upsert: false }));
    }
    if (error) throw new BadRequestException(`Upload failed: ${error.message}`);

    // Kept for older clients and for parity with legacy rows; never returned while
    // `storagePath` is set.
    const fileUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    const resource = await this.prisma.libraryResource.create({
      data: {
        title,
        description: body.description?.trim() || null,
        resourceType,
        tags: this.parseTags(body.tags),
        fileUrl,
        storagePath: path,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        scope,
        organizationId,
        uploadedById: actor.id,
        audience: audience.audience,
        audienceSegment: audience.audienceSegment,
        downloadable: audience.downloadable,
        ...this.parseJourneyTags(body),
        audienceOrgs: {
          create: audience.organizationIds.map((id) => ({ organizationId: id })),
        },
      },
      include: RESOURCE_INCLUDE,
    });

    this.logger.log(
      `Library resource ${resource.id} uploaded (${scope}, ${audience.audience}/${audience.audienceSegment}) by ${actor.id}`,
    );
    return (await this.present([resource], true))[0];
  }

  /** Edit details and audience in place — no re-upload. Same permission as delete. */
  async update(
    actor: Actor,
    id: string,
    body: {
      title?: string;
      description?: string | null;
      resourceType?: string;
      tags?: string | string[];
    } & AudienceInput &
      JourneyTagsInput,
  ) {
    const existing = await this.prisma.libraryResource.findUnique({
      where: { id },
      include: { audienceOrgs: { select: { organizationId: true } } },
    });
    if (!existing) throw new NotFoundException('Resource not found.');
    await this.assertMayManage(actor, existing);

    const data: Prisma.LibraryResourceUpdateInput = {};
    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) throw new BadRequestException('A title is required.');
      data.title = title;
    }
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.resourceType !== undefined) data.resourceType = this.parseResourceType(body.resourceType);
    if (body.tags !== undefined) data.tags = this.parseTags(body.tags);
    Object.assign(data, this.parseJourneyTags(body));

    const touchesAudience =
      body.audience !== undefined ||
      body.organizationIds !== undefined ||
      body.audienceSegment !== undefined ||
      body.downloadable !== undefined;

    if (touchesAudience) {
      const currentOrgIds = existing.audienceOrgs.map((o) => o.organizationId);
      // Unspecified fields keep their current value.
      const audience = await this.resolveAudience(
        actor,
        { ...existing, current: { audience: existing.audience as Audience, organizationIds: currentOrgIds } },
        {
          audience: body.audience ?? existing.audience,
          organizationIds: body.organizationIds ?? currentOrgIds,
          audienceSegment: body.audienceSegment ?? existing.audienceSegment,
          downloadable: body.downloadable ?? existing.downloadable,
        },
      );
      data.audience = audience.audience;
      data.audienceSegment = audience.audienceSegment;
      data.downloadable = audience.downloadable;
      data.audienceOrgs = {
        deleteMany: {},
        create: audience.organizationIds.map((orgId) => ({ organizationId: orgId })),
      };
    }

    const resource = await this.prisma.libraryResource.update({
      where: { id },
      data,
      include: RESOURCE_INCLUDE,
    });
    return (await this.present([resource], true))[0];
  }

  async remove(actor: Actor, id: string) {
    const resource = await this.prisma.libraryResource.findUnique({
      where: { id },
      select: { id: true, scope: true, organizationId: true, uploadedById: true, storagePath: true },
    });
    if (!resource) throw new NotFoundException('Resource not found.');
    await this.assertMayManage(actor, resource);

    await this.prisma.libraryResource.delete({ where: { id } });

    // Best effort: the row is the source of truth, so a storage hiccup must not resurrect it.
    if (resource.storagePath) {
      try {
        const { error } = await this.supabase().storage.from(BUCKET).remove([resource.storagePath]);
        if (error) throw error;
      } catch (e: any) {
        this.logger.warn(`Library resource ${id}: file ${resource.storagePath} not removed — ${e?.message ?? e}`);
      }
    }
    return { deleted: true };
  }

  // ─── visibility ─────────────────────────────────────────────────────────────

  /**
   * Signed view/download links for a batch of rows, keyed by id — for callers outside
   * this service (the Resources journey) that list rows themselves. Same rules as list().
   */
  async signedLinks(
    rows: Array<{ id: string; storagePath: string | null; fileUrl: string; downloadable: boolean }>,
  ): Promise<Map<string, { fileUrl: string | null; downloadUrl: string | null }>> {
    const out = new Map<string, { fileUrl: string | null; downloadUrl: string | null }>();
    const signed = rows.filter((r) => r.storagePath);
    if (signed.length) {
      const storage = this.supabase().storage.from(BUCKET);
      const downloadable = signed.filter((r) => r.downloadable);
      const [viewRes, downloadRes] = await Promise.all([
        storage.createSignedUrls(signed.map((r) => r.storagePath!), SIGNED_URL_TTL_SECONDS),
        downloadable.length
          ? storage.createSignedUrls(downloadable.map((r) => r.storagePath!), SIGNED_URL_TTL_SECONDS, { download: true })
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (viewRes.error || downloadRes.error) {
        this.logger.error(`Signing library files failed: ${(viewRes.error ?? downloadRes.error)?.message}`);
        throw new ServiceUnavailableException('Could not prepare the files — please try again.');
      }
      const view = this.signedMap(viewRes.data);
      const download = this.signedMap(downloadRes.data);
      for (const r of signed) {
        out.set(r.id, {
          fileUrl: view.get(r.storagePath!) ?? null,
          downloadUrl: r.downloadable ? (download.get(r.storagePath!) ?? null) : null,
        });
      }
    }
    for (const r of rows) {
      if (!r.storagePath) out.set(r.id, { fileUrl: r.fileUrl, downloadUrl: r.downloadable ? r.fileUrl : null });
    }
    return out;
  }

  /** The resources aimed at this user: audience match AND segment match. */
  async visibleTo(actor: Actor): Promise<Prisma.LibraryResourceWhereInput> {
    const orgIds = await this.attachedOrganizationIds(actor);
    const segment: AudienceSegment = actor.role === 'USER' ? 'FAMILIES' : 'STAFF';

    return {
      AND: [
        {
          OR: [
            { audience: 'EVERYONE' },
            ...(orgIds.length
              ? [
                  { audience: 'ALL_ORGS' },
                  { audience: 'ORGS', audienceOrgs: { some: { organizationId: { in: orgIds } } } },
                ]
              : []),
          ],
        },
        { audienceSegment: { in: ['ALL', segment] } },
      ],
    };
  }

  /**
   * Organizations this user belongs to: ACTIVE memberships, plus — for families who
   * never become org members — orgs whose facility has an ACTIVE affiliation with one of
   * their children. Reads affiliation status only, never child data.
   */
  private async attachedOrganizationIds(actor: Actor): Promise<string[]> {
    const [memberships, facilities] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where: { userId: actor.id, status: 'ACTIVE' },
        select: { organizationId: true },
      }),
      this.prisma.facility.findMany({
        where: {
          affiliations: {
            some: {
              status: 'ACTIVE',
              child: {
                OR: [{ profile: { userId: actor.id } }, { guardians: { some: { userId: actor.id } } }],
              },
            },
          },
        },
        select: { organizationId: true },
      }),
    ]);
    return [
      ...new Set([
        ...memberships.map((m) => m.organizationId),
        ...facilities.map((f) => f.organizationId),
      ]),
    ];
  }

  /**
   * Validates an audience for a resource owned by `owner` and normalises it.
   *
   * Platform-owned: any audience; always downloadable.
   * Org-owned: the org's admins choose only the segment and the download flag — the
   * audience stays what it is (its own organization when new), so an org admin's edit
   * never undoes a wider share. Platform admins may widen it to ALL_ORGS, EVERYONE or
   * selected organizations; the owning organization is always kept in an ORGS list.
   */
  private async resolveAudience(
    actor: Actor,
    owner: {
      scope: LibraryResourceScope;
      organizationId: string | null;
      mimeType: string;
      /** Set when editing; absent on create. */
      current?: { audience: Audience; organizationIds: string[] };
    },
    input: AudienceInput,
  ): Promise<{
    audience: Audience;
    audienceSegment: AudienceSegment;
    organizationIds: string[];
    downloadable: boolean;
  }> {
    const audienceSegment = (input.audienceSegment ?? 'ALL').toUpperCase() as AudienceSegment;
    if (!AUDIENCE_SEGMENTS.includes(audienceSegment)) {
      throw new BadRequestException(`audienceSegment must be one of ${AUDIENCE_SEGMENTS.join(', ')}.`);
    }

    if (owner.scope === 'ORGANIZATION') {
      const downloadable = this.parseBool(input.downloadable, true);
      if (!downloadable && !VIEWABLE_MIME.includes(owner.mimeType)) {
        throw new BadRequestException(
          'Only PDF, image and video files can be view-only. Convert the file to PDF first.',
        );
      }
      if (!this.isPlatformAdmin(actor)) {
        return {
          ...(owner.current ?? { audience: 'ORGS' as const, organizationIds: [owner.organizationId!] }),
          audienceSegment,
          downloadable,
        };
      }
      return {
        ...(await this.parseAudience(input, owner.organizationId!)),
        audienceSegment,
        downloadable,
      };
    }

    return {
      ...(await this.parseAudience(input, null)),
      audienceSegment,
      downloadable: true,
    };
  }

  /**
   * A platform admin's audience choice. `owningOrgId` (org-owned resources) defaults the
   * audience to that org and is always kept in an ORGS list.
   */
  private async parseAudience(
    input: AudienceInput,
    owningOrgId: string | null,
  ): Promise<{ audience: Audience; organizationIds: string[] }> {
    const audience = (input.audience ?? (owningOrgId ? 'ORGS' : 'EVERYONE')).toUpperCase() as Audience;
    if (!AUDIENCES.includes(audience)) {
      throw new BadRequestException(`audience must be one of ${AUDIENCES.join(', ')}.`);
    }

    let organizationIds: string[] = [];
    if (audience === 'ORGS') {
      organizationIds = [
        ...new Set([...(owningOrgId ? [owningOrgId] : []), ...this.parseList(input.organizationIds)]),
      ];
      if (!organizationIds.length) {
        throw new BadRequestException('Choose at least one organization.');
      }
      if (organizationIds.length > MAX_TARGET_ORGS) {
        throw new BadRequestException(`At most ${MAX_TARGET_ORGS} organizations.`);
      }
      const found = await this.prisma.organization.count({ where: { id: { in: organizationIds } } });
      if (found !== organizationIds.length) {
        throw new BadRequestException('One or more organizations do not exist.');
      }
    }

    return { audience, organizationIds };
  }

  // ─── response shaping ───────────────────────────────────────────────────────

  /**
   * Swaps the stored public URL for signed ones. `fileUrl` opens the file inline;
   * `downloadUrl` (null when view-only) saves it. The targeted-organization list is a
   * management detail and is only returned to those who manage the shelf.
   */
  private async present(rows: ResourceRow[], manage: boolean) {
    const signedPaths = rows.map((r) => r.storagePath).filter((p): p is string => !!p);
    const downloadPaths = rows
      .filter((r) => r.storagePath && r.downloadable)
      .map((r) => r.storagePath!);

    let view = new Map<string, string>();
    let download = new Map<string, string>();
    if (signedPaths.length) {
      const storage = this.supabase().storage.from(BUCKET);
      const [viewRes, downloadRes] = await Promise.all([
        storage.createSignedUrls(signedPaths, SIGNED_URL_TTL_SECONDS),
        downloadPaths.length
          ? storage.createSignedUrls(downloadPaths, SIGNED_URL_TTL_SECONDS, { download: true })
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (viewRes.error || downloadRes.error) {
        this.logger.error(
          `Signing library files failed: ${(viewRes.error ?? downloadRes.error)?.message}`,
        );
        throw new ServiceUnavailableException('Could not prepare the files — please try again.');
      }
      view = this.signedMap(viewRes.data);
      download = this.signedMap(downloadRes.data);
    }

    return rows.map(({ audienceOrgs, storagePath, fileUrl, ...r }) => {
      const url = storagePath ? (view.get(storagePath) ?? null) : fileUrl;
      return {
        ...r,
        fileUrl: url,
        downloadUrl: r.downloadable ? (storagePath ? (download.get(storagePath) ?? null) : fileUrl) : null,
        ...(manage ? { audienceOrgs: audienceOrgs.map((o) => o.organization) } : {}),
      };
    });
  }

  private signedMap(data: { path: string | null; signedUrl: string; error: string | null }[] | null) {
    const map = new Map<string, string>();
    for (const d of data ?? []) if (d.path && d.signedUrl && !d.error) map.set(d.path, d.signedUrl);
    return map;
  }

  // ─── permissions ────────────────────────────────────────────────────────────

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

  /** Uploader, platform admin, or an admin of the owning organization. */
  private async assertMayManage(
    actor: Actor,
    resource: { organizationId: string | null; uploadedById: string | null },
  ) {
    const may =
      resource.uploadedById === actor.id ||
      this.isPlatformAdmin(actor) ||
      (resource.organizationId ? await this.isOrgAdmin(actor, resource.organizationId) : false);
    if (!may) throw new ForbiddenException('You cannot change this resource.');
  }

  // ─── parsing ────────────────────────────────────────────────────────────────

  /** Only the fields present in `body` are returned, so an edit leaves the rest alone. */
  private parseJourneyTags(body: JourneyTagsInput) {
    const out: {
      domains?: string[];
      ageMin?: number | null;
      ageMax?: number | null;
      durationMinutes?: number | null;
      practises?: string | null;
      forText?: string | null;
    } = {};
    const int = (v: string | number | null | undefined, name: string, max: number) => {
      if (v === null || v === '') return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > max) throw new BadRequestException(`${name} must be a whole number from 0 to ${max}.`);
      return n;
    };
    const text = (v: string | null | undefined) => (v == null ? null : v.trim().slice(0, 200) || null);
    if (body.domains !== undefined) out.domains = parseDomains(body.domains);
    if (body.ageMin !== undefined) out.ageMin = int(body.ageMin, 'ageMin', 18);
    if (body.ageMax !== undefined) out.ageMax = int(body.ageMax, 'ageMax', 18);
    if (body.durationMinutes !== undefined) out.durationMinutes = int(body.durationMinutes, 'durationMinutes', 600);
    if (body.practises !== undefined) out.practises = text(body.practises);
    if (body.forText !== undefined) out.forText = text(body.forText);
    if (out.ageMin != null && out.ageMax != null && out.ageMin > out.ageMax) {
      throw new BadRequestException('ageMin cannot be greater than ageMax.');
    }
    return out;
  }

  private parseResourceType(value: string | undefined) {
    const resourceType = value?.toUpperCase();
    if (!resourceType || !(RESOURCE_TYPES as readonly string[]).includes(resourceType)) {
      throw new BadRequestException(`resourceType must be one of ${RESOURCE_TYPES.join(', ')}.`);
    }
    return resourceType;
  }

  private parseTags(value: string | string[] | undefined) {
    return this.parseList(value).slice(0, 10);
  }

  /** Multipart sends lists as comma-separated strings; JSON as arrays. */
  private parseList(value: string | string[] | undefined): string[] {
    const items = Array.isArray(value) ? value : (value ?? '').split(',');
    return items.map((t) => String(t).trim()).filter(Boolean);
  }

  private parseBool(value: string | boolean | undefined, fallback: boolean) {
    if (value === undefined || value === '') return fallback;
    return value === true || value === 'true';
  }

  private supabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new BadRequestException('Supabase is not configured.');
    return createClient(url, key);
  }
}
