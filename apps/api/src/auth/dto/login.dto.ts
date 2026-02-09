import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType } from '../../fcm-token/dto';

export class LoginDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address'
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password'
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;

  @ApiPropertyOptional({
    example: 'dAPZpk2bRl2XXXXXXXXXXXXXX:APA91bGXXXXXXXXXX...',
    description: 'Firebase Cloud Messaging token for push notifications'
  })
  @IsString()
  @IsOptional()
  fcmToken?: string;

  @ApiPropertyOptional({
    enum: () => DeviceType,
    enumName: 'DeviceType',
    example: DeviceType.WEB,
    description: 'Device type (web, ios, android, browser)'
  })
  @IsEnum(DeviceType)
  @IsOptional()
  device?: DeviceType;
}
