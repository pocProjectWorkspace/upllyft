import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetTokenDto {
  @ApiProperty({
    description: 'The reset token to verify',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}