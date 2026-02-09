import { IsString, IsOptional } from 'class-validator';

export class RegenerateSectionDto {
  @IsString()
  sectionId: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}
