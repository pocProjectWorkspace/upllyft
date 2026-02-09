import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsString()     // Changed from @IsUUID()
  @IsNotEmpty()
  postId: string;

  @IsString()     // Changed from @IsUUID()
  @IsOptional()
  parentId?: string;
}