import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UploadReportDto {
  @IsString()
  fileName: string;

  @IsString()
  contentType: string;

  @IsOptional()
  @IsString()
  childId?: string;
}

export class ParseReportDto {
  @IsString()
  reportUrl: string;

  @IsOptional()
  @IsString()
  childId?: string;

  @IsOptional()
  @IsEnum(['pdf', 'image'] as const)
  fileType?: 'pdf' | 'image';
}
