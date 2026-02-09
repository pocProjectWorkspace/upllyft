import { IsString, IsEnum, IsIn, IsNotEmpty } from 'class-validator';

export class CreateVoteDto {
  @IsString()     // Changed from @IsUUID()
  @IsNotEmpty()
  targetId: string;

  @IsEnum(['post', 'comment'])
  targetType: 'post' | 'comment';

  @IsIn([1, -1, 0])
  value: number;
}
