import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FAQ_SEED } from './faq-seed';

export const FAQ_AUDIENCES = ['PARENT', 'THERAPIST', 'FACILITY', 'ALL'] as const;

export interface FaqCategoryInput {
  slug?: string;
  name?: string;
  audience?: string;
  sortOrder?: number;
}

export interface FaqItemInput {
  slug?: string;
  categoryId?: string;
  question?: string;
  answer?: string;
  published?: boolean;
  sortOrder?: number;
}

const ITEM_ORDER = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }];

/** Lower-case, hyphenated, at most 60 characters: the /help#<slug> anchor. */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/**
 * Help Center FAQ (/help). Public read of published items, admin CRUD for the
 * console at /admin/faq. The tables are seeded from FAQ_SEED the first time the API
 * boots against an empty faq_categories table; slugs are unique, so a second replica
 * booting at the same moment skips the rows the first one wrote.
 */
@Injectable()
export class FaqService implements OnModuleInit {
  private readonly logger = new Logger(FaqService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      if ((await this.prisma.faqCategory.count()) > 0) return;
      await this.seed();
    } catch (error) {
      // A missing table (migration not applied yet) must not stop the API from booting.
      this.logger.warn(`FAQ seed skipped: ${(error as Error).message}`);
    }
  }

  private async seed() {
    await this.prisma.faqCategory.createMany({
      data: FAQ_SEED.map((c, i) => ({ slug: c.slug, name: c.name, audience: c.audience, sortOrder: i })),
      skipDuplicates: true,
    });
    const categories = await this.prisma.faqCategory.findMany({ select: { id: true, slug: true } });
    const idBySlug = new Map(categories.map((c) => [c.slug, c.id]));
    const { count } = await this.prisma.faqItem.createMany({
      data: FAQ_SEED.flatMap((c) =>
        c.items.map((item, i) => ({ ...item, categoryId: idBySlug.get(c.slug)!, sortOrder: i })),
      ),
      skipDuplicates: true,
    });
    this.logger.log(`Seeded the Help Center with ${count} FAQ items`);
  }

  /** Public: categories in order with their published items; empty categories are left out. */
  async listPublished() {
    const categories = await this.prisma.faqCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        slug: true,
        name: true,
        audience: true,
        items: {
          where: { published: true },
          orderBy: ITEM_ORDER,
          select: { slug: true, question: true, answer: true },
        },
      },
    });
    return categories.filter((c) => c.items.length > 0);
  }

  /** Admin: everything, including unpublished drafts. */
  listAll() {
    return this.prisma.faqCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { items: { orderBy: ITEM_ORDER } },
    });
  }

  async createCategory(input: FaqCategoryInput) {
    if (!input.name?.trim()) throw new BadRequestException('A category needs a name.');
    const last = await this.prisma.faqCategory.aggregate({ _max: { sortOrder: true } });
    return this.unique(() =>
      this.prisma.faqCategory.create({
        data: {
          name: input.name!.trim(),
          slug: toSlug(input.slug || input.name!),
          audience: input.audience ?? 'ALL',
          sortOrder: input.sortOrder ?? (last._max.sortOrder ?? -1) + 1,
        },
      }),
    );
  }

  async updateCategory(id: string, input: FaqCategoryInput) {
    await this.findCategory(id);
    return this.unique(() =>
      this.prisma.faqCategory.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name.trim() }),
          // A cleared link name keeps the current slug.
          ...(input.slug && toSlug(input.slug) && { slug: toSlug(input.slug) }),
          ...(input.audience !== undefined && { audience: input.audience }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        },
      }),
    );
  }

  /** Deletes the category and its items. */
  async deleteCategory(id: string) {
    await this.findCategory(id);
    await this.prisma.faqCategory.delete({ where: { id } });
    return { deleted: true };
  }

  async createItem(input: FaqItemInput) {
    if (!input.categoryId || !input.question?.trim() || !input.answer?.trim()) {
      throw new BadRequestException('An item needs a category, a question and an answer.');
    }
    await this.findCategory(input.categoryId);
    const last = await this.prisma.faqItem.aggregate({
      where: { categoryId: input.categoryId },
      _max: { sortOrder: true },
    });
    return this.unique(() =>
      this.prisma.faqItem.create({
        data: {
          categoryId: input.categoryId!,
          question: input.question!.trim(),
          answer: input.answer!.trim(),
          slug: toSlug(input.slug || input.question!),
          published: input.published ?? false,
          sortOrder: input.sortOrder ?? (last._max.sortOrder ?? -1) + 1,
        },
      }),
    );
  }

  async updateItem(id: string, input: FaqItemInput) {
    const existing = await this.prisma.faqItem.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('FAQ item not found');
    if (input.categoryId) await this.findCategory(input.categoryId);
    return this.unique(() =>
      this.prisma.faqItem.update({
        where: { id },
        data: {
          ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
          ...(input.question !== undefined && { question: input.question.trim() }),
          ...(input.answer !== undefined && { answer: input.answer.trim() }),
          // A cleared link name keeps the current slug.
          ...(input.slug && toSlug(input.slug) && { slug: toSlug(input.slug) }),
          ...(input.published !== undefined && { published: input.published }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        },
      }),
    );
  }

  async deleteItem(id: string) {
    const existing = await this.prisma.faqItem.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('FAQ item not found');
    await this.prisma.faqItem.delete({ where: { id } });
    return { deleted: true };
  }

  private async findCategory(id: string) {
    const category = await this.prisma.faqCategory.findUnique({ where: { id }, select: { id: true } });
    if (!category) throw new NotFoundException('FAQ category not found');
    return category;
  }

  /** Turns a slug clash into a 400 the console can show. */
  private async unique<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('That link name (slug) is already used; choose another.');
      }
      throw error;
    }
  }
}
