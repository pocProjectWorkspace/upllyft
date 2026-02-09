import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBookmarkDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  postId?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  questionId?: string;
}