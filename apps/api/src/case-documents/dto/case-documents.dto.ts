import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { CaseDocumentType } from '@prisma/client';

export class CreateCaseDocumentDto {
  @IsEnum(CaseDocumentType)
  type: CaseDocumentType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class ShareDocumentDto {
  @IsString()
  sharedWithUserId: string;

  @IsOptional()
  @IsString()
  documentId?: string;
}

export class RevokeShareDto {
  @IsString()
  shareId: string;
}

export class ListDocumentsQueryDto {
  @IsOptional()
  @IsEnum(CaseDocumentType)
  type?: CaseDocumentType;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class GenerateReportDto {
  @IsEnum(['progress', 'case_summary', 'discharge'] as const)
  reportType: 'progress' | 'case_summary' | 'discharge';

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  focusAreas?: string;
}
