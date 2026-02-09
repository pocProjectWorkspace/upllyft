// apps/api/src/posts/dto/create-post.dto.ts
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';

export enum PostType {
  DISCUSSION = 'DISCUSSION',
  QUESTION = 'QUESTION',
  CASE_STUDY = 'CASE_STUDY',
  RESOURCE = 'RESOURCE',
}

export class CreatePostDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsEnum(PostType)
  @IsOptional()
  type?: PostType;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @IsString()
  @IsOptional()
  communityId?: string;

  // This will be added by the controller
  @IsString()
  @IsOptional()
  authorId?: string;

  @IsString()
  @IsOptional()
  summary: any;
}