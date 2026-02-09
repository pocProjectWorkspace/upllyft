import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';

export class UpdateWorksheetDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditionTags?: string[];
}
