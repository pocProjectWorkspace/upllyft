import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class RegenerateImageDto {
  @IsString()
  imageId: string;

  @IsOptional()
  @IsString()
  customPrompt?: string;
}
