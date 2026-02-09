import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WorksheetAiService, AnyWorksheetContent, WorksheetContent } from './worksheet-ai.service';
import { WorksheetImageService } from './worksheet-image.service';
import { WorksheetPdfService } from './worksheet-pdf.service';
import { WorksheetDataSourcesService, DataSourceResult } from './worksheet-data-sources.service';
import { GenerateWorksheetDto } from './dto/generate-worksheet.dto';
import { ListWorksheetsDto } from './dto/list-worksheets.dto';
import { UpdateWorksheetDto } from './dto/update-worksheet.dto';
import { RegenerateSectionDto } from './dto/regenerate-section.dto';
import { RegenerateImageDto } from './dto/regenerate-image.dto';
import { LinkCaseDto } from './dto/link-case.dto';
import {
  Worksheet,
  WorksheetStatus,
  WorksheetImageStatus,
  WorksheetDataSource,
  Prisma,
} from '@prisma/client';

@Injectable()
export class WorksheetsService {
  private readonly logger = new Logger(WorksheetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: WorksheetAiService,
    private readonly imageService: WorksheetImageService,
    private readonly pdfService: WorksheetPdfService,
    private readonly dataSourcesService: WorksheetDataSourcesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generate a new worksheet. Resolves data source, generates content,
   * then kicks off async image + PDF generation.
   */
  async generate(
    dto: GenerateWorksheetDto,
    userId: string,
  ): Promise<Worksheet> {
    // Step 1: Resolve data source to normalized parameters
    const sourceData = await this.resolveDataSource(dto);

    // Step 2: Generate content via Claude
    const content = await this.aiService.generateWorksheetContent({
      childAge: sourceData.childAge,
      conditions: sourceData.conditions,
      developmentalNotes: sourceData.developmentalNotes,
      subType: dto.subType,
      targetDomains: dto.targetDomains,
      difficulty: dto.difficulty,
      interests: dto.interests,
      duration: dto.duration,
      setting: dto.setting,
      specialInstructions: dto.specialInstructions ?? '',
      worksheetType: dto.type,
      dataSource: dto.dataSource,
      contextData: sourceData.contextData,
    });

    // Step 3: Persist worksheet with GENERATING status
    const worksheet = await this.prisma.worksheet.create({
      data: {
        title: content.title,
        type: dto.type,
        subType: dto.subType,
        content: content as unknown as Prisma.JsonObject,
        metadata: {
          dataSource: dto.dataSource,
          manualInput: dto.manualInput ?? null,
          screeningInput: dto.screeningInput ?? null,
          uploadedReportInput: dto.uploadedReportInput ?? null,
          iepGoalsInput: dto.iepGoalsInput ?? null,
          sessionNotesInput: dto.sessionNotesInput ?? null,
          interests: dto.interests,
          duration: dto.duration,
          setting: dto.setting,
          specialInstructions: dto.specialInstructions ?? null,
        } as unknown as Prisma.JsonObject,
        status: WorksheetStatus.GENERATING,
        colorMode: dto.colorMode,
        difficulty: dto.difficulty,
        targetDomains: dto.targetDomains,
        conditionTags: sourceData.conditions,
        dataSource: dto.dataSource as WorksheetDataSource,
        screeningId: dto.screeningInput?.assessmentId ?? null,
        caseId: dto.caseId ?? dto.iepGoalsInput?.caseId ?? null,
        iepGoalIds: dto.iepGoalsInput?.goalIds ?? [],
        sessionNoteIds: dto.sessionNotesInput?.sessionIds ?? [],
        uploadedReportUrl: dto.uploadedReportInput?.reportUrl ?? null,
        parsedReportData: dto.uploadedReportInput?.parsedData
          ? (dto.uploadedReportInput.parsedData as unknown as Prisma.JsonObject)
          : Prisma.JsonNull,
        createdById: userId,
        childId: dto.childId ?? dto.screeningInput?.childId ?? dto.uploadedReportInput?.childId ?? null,
      },
      include: { images: true },
    });

    // Step 4: Kick off background image + PDF generation
    this.generateAssetsInBackground(worksheet.id, content, dto);

    return worksheet;
  }

  private async resolveDataSource(dto: GenerateWorksheetDto): Promise<DataSourceResult> {
    switch (dto.dataSource) {
      case 'SCREENING':
        if (!dto.screeningInput) {
          throw new BadRequestException('screeningInput is required for SCREENING data source');
        }
        return this.dataSourcesService.resolveScreeningDataSource(
          dto.screeningInput.assessmentId,
          dto.screeningInput.childId,
        );

      case 'UPLOADED_REPORT':
        if (!dto.uploadedReportInput) {
          throw new BadRequestException('uploadedReportInput is required for UPLOADED_REPORT data source');
        }
        return this.dataSourcesService.resolveUploadedReportDataSource(
          dto.uploadedReportInput.parsedData ?? {},
          dto.uploadedReportInput.childId,
        );

      case 'IEP_GOALS':
        if (!dto.iepGoalsInput) {
          throw new BadRequestException('iepGoalsInput is required for IEP_GOALS data source');
        }
        return this.dataSourcesService.resolveIEPGoalsDataSource(
          dto.iepGoalsInput.caseId,
          dto.iepGoalsInput.goalIds,
        );

      case 'SESSION_NOTES':
        if (!dto.sessionNotesInput) {
          throw new BadRequestException('sessionNotesInput is required for SESSION_NOTES data source');
        }
        return this.dataSourcesService.resolveSessionNotesDataSource(
          dto.sessionNotesInput.caseId,
          dto.sessionNotesInput.sessionIds,
        );

      case 'MANUAL':
      default:
        if (!dto.manualInput) {
          throw new BadRequestException('manualInput is required for MANUAL data source');
        }
        return {
          childAge: dto.manualInput.childAge,
          conditions: dto.manualInput.conditions ?? [],
          developmentalNotes: dto.manualInput.developmentalNotes ?? '',
          suggestedDomains: [],
        };
    }
  }

  private async generateAssetsInBackground(
    worksheetId: string,
    content: AnyWorksheetContent,
    dto: GenerateWorksheetDto,
  ): Promise<void> {
    try {
      const imagePrompts = this.extractImagePrompts(content, dto.type);

      const ageMonths = dto.manualInput?.childAge ?? 48;

      const imageMap = await this.imageService.generateImagesForWorksheet({
        activities: imagePrompts,
        interests: dto.interests,
        setting: dto.setting,
        ageMonths,
        colorMode: dto.colorMode,
        maxImages: dto.type === 'ACTIVITY' ? 5 : 8,
      });

      const imageRecords: Array<{
        worksheetId: string;
        imageUrl: string;
        prompt: string;
        altText: string;
        position: number;
        status: WorksheetImageStatus;
      }> = [];

      let position = 0;
      for (const [, image] of imageMap) {
        imageRecords.push({
          worksheetId,
          imageUrl: image.imageUrl,
          prompt: image.prompt,
          altText: image.altText,
          position: position++,
          status: image.imageUrl
            ? WorksheetImageStatus.COMPLETED
            : WorksheetImageStatus.FAILED,
        });
      }

      if (imageRecords.length > 0) {
        await this.prisma.worksheetImage.createMany({ data: imageRecords });
      }

      const imagesForPdf = new Map<string, { imageUrl: string; altText: string }>();
      for (const [activityId, image] of imageMap) {
        if (image.imageUrl) {
          imagesForPdf.set(activityId, {
            imageUrl: image.imageUrl,
            altText: image.altText,
          });
        }
      }

      const { pdfUrl, previewUrl } = await this.pdfService.generatePdf({
        title: content.title,
        worksheetType: dto.type,
        subType: dto.subType,
        difficulty: dto.difficulty,
        duration: dto.duration,
        setting: dto.setting,
        targetDomains: dto.targetDomains,
        content,
        images: imagesForPdf,
      });

      await this.prisma.worksheet.update({
        where: { id: worksheetId },
        data: {
          pdfUrl,
          previewUrl,
          status: WorksheetStatus.PUBLISHED,
        },
      });

      this.eventEmitter.emit('worksheet.ready', {
        worksheetId,
        pdfUrl,
        previewUrl,
      });

      this.logger.log(`Worksheet ${worksheetId} generation complete`);
    } catch (error) {
      this.logger.error(
        `Background generation failed for worksheet ${worksheetId}: ${error.message}`,
      );

      await this.prisma.worksheet.update({
        where: { id: worksheetId },
        data: { status: WorksheetStatus.DRAFT },
      });

      this.eventEmitter.emit('worksheet.error', {
        worksheetId,
        error: error.message,
      });
    }
  }

  private extractImagePrompts(
    content: AnyWorksheetContent,
    worksheetType: string,
  ): Array<{ id: string; imagePrompt: string; name: string }> {
    switch (worksheetType) {
      case 'VISUAL_SUPPORT': {
        const vsContent = content as any;
        if (vsContent.steps) {
          return vsContent.steps.map((s: any) => ({
            id: s.id,
            imagePrompt: s.imagePrompt || s.visualCue || s.label,
            name: s.label || s.id,
          }));
        }
        if (vsContent.pages) {
          return vsContent.pages.map((p: any) => ({
            id: p.id,
            imagePrompt: p.imagePrompt,
            name: `Page ${p.order}`,
          }));
        }
        if (vsContent.levels) {
          return vsContent.levels.map((l: any) => ({
            id: l.id,
            imagePrompt: l.imagePrompt,
            name: l.name,
          }));
        }
        return [];
      }

      case 'STRUCTURED_PLAN': {
        const spContent = content as any;
        if (spContent.timeBlocks) {
          return spContent.timeBlocks
            .filter((b: any) => b.activity?.imagePrompt)
            .slice(0, 6)
            .map((b: any) => ({
              id: b.id,
              imagePrompt: b.activity.imagePrompt,
              name: b.activity.name,
            }));
        }
        if (spContent.days) {
          const prompts: Array<{ id: string; imagePrompt: string; name: string }> = [];
          for (const day of spContent.days) {
            if (day.activities?.[0]) {
              prompts.push({
                id: day.activities[0].id,
                imagePrompt: day.activities[0].description || day.activities[0].name,
                name: day.activities[0].name,
              });
            }
            if (prompts.length >= 5) break;
          }
          return prompts;
        }
        return [];
      }

      case 'ACTIVITY':
      default: {
        const actContent = content as WorksheetContent;
        return actContent.sections.flatMap((s) =>
          s.activities.map((a) => ({
            id: a.id,
            imagePrompt: a.imagePrompt,
            name: a.name,
          })),
        );
      }
    }
  }

  // ─── Case Linking ──────────────────────────────────────────

  async linkCase(worksheetId: string, dto: LinkCaseDto, userId: string) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: dto.caseId },
    });
    if (!caseRecord) throw new NotFoundException('Case not found');

    return this.prisma.worksheet.update({
      where: { id: worksheetId },
      data: { caseId: dto.caseId },
    });
  }

  async getCaseWorksheets(caseId: string) {
    return this.prisma.worksheet.findMany({
      where: { caseId, status: { not: WorksheetStatus.ARCHIVED } },
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── CRUD ─────────────────────────────────────────────────

  async getMyLibrary(userId: string, dto: ListWorksheetsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: Prisma.WorksheetWhereInput = {
      createdById: userId,
      status: { not: WorksheetStatus.ARCHIVED },
    };

    if (dto.type) where.type = dto.type;
    if (dto.status) where.status = dto.status;
    if (dto.difficulty) where.difficulty = dto.difficulty;
    if (dto.subType) where.subType = dto.subType;
    if (dto.childId) where.childId = dto.childId;
    if (dto.domain) where.targetDomains = { has: dto.domain };
    if (dto.search) {
      where.title = { contains: dto.search, mode: 'insensitive' };
    }

    const [worksheets, total] = await Promise.all([
      this.prisma.worksheet.findMany({
        where,
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          child: { select: { id: true, firstName: true, nickname: true } },
        },
        orderBy: { [dto.sortBy ?? 'createdAt']: dto.sortOrder ?? 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.worksheet.count({ where }),
    ]);

    return {
      data: worksheets,
      total,
      page,
      limit,
      hasMore: skip + worksheets.length < total,
    };
  }

  async getOne(id: string) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        child: { select: { id: true, firstName: true, nickname: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (!worksheet) {
      throw new NotFoundException('Worksheet not found');
    }

    return worksheet;
  }

  async update(id: string, dto: UpdateWorksheetDto) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id },
    });

    if (!worksheet) {
      throw new NotFoundException('Worksheet not found');
    }

    const updateData: Prisma.WorksheetUpdateInput = {};
    if (dto.title) updateData.title = dto.title;
    if (dto.content) updateData.content = dto.content as unknown as Prisma.JsonObject;
    if (dto.conditionTags) updateData.conditionTags = dto.conditionTags;

    return this.prisma.worksheet.update({
      where: { id },
      data: updateData,
      include: { images: { orderBy: { position: 'asc' } } },
    });
  }

  async remove(id: string) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');

    return this.prisma.worksheet.update({
      where: { id },
      data: { status: WorksheetStatus.ARCHIVED },
    });
  }

  async regenerateSection(worksheetId: string, dto: RegenerateSectionDto) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');

    const content = worksheet.content as unknown as WorksheetContent;
    const newSection = await this.aiService.regenerateSection(
      content as unknown as Record<string, any>,
      dto.sectionId,
      dto.instructions,
    );

    const updatedSections = content.sections.map((s) =>
      s.id === dto.sectionId ? { ...newSection, id: dto.sectionId } : s,
    );
    const updatedContent = { ...content, sections: updatedSections };

    return this.prisma.worksheet.update({
      where: { id: worksheetId },
      data: { content: updatedContent as unknown as Prisma.JsonObject },
      include: { images: { orderBy: { position: 'asc' } } },
    });
  }

  async regenerateImage(worksheetId: string, dto: RegenerateImageDto) {
    const image = await this.prisma.worksheetImage.findUnique({
      where: { id: dto.imageId },
    });
    if (!image || image.worksheetId !== worksheetId) {
      throw new NotFoundException('Image not found');
    }

    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');

    const metadata = worksheet.metadata as Record<string, any>;
    const prompt = dto.customPrompt ?? image.prompt;

    const newImage = await this.imageService.generateImage({
      activityImagePrompt: prompt,
      altText: image.altText,
      interests: metadata.interests ?? '',
      setting: metadata.setting ?? 'HOME',
      ageMonths: metadata.manualInput?.childAge ?? 48,
      colorMode: worksheet.colorMode,
    });

    return this.prisma.worksheetImage.update({
      where: { id: dto.imageId },
      data: {
        imageUrl: newImage.imageUrl,
        prompt: newImage.prompt,
        status: newImage.imageUrl
          ? WorksheetImageStatus.COMPLETED
          : WorksheetImageStatus.FAILED,
      },
    });
  }

  async getStatus(id: string) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id },
      select: { id: true, status: true, pdfUrl: true, previewUrl: true },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');
    return worksheet;
  }
}
