// apps/api/src/feeds/dto/feed-interaction.dto.ts
import { IsString, IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { InteractionType } from '@prisma/client';

export class FeedInteractionDto {
  @IsString()
  postId: string;

  @IsEnum(InteractionType)
  action: InteractionType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  scrollDepth?: number;
}