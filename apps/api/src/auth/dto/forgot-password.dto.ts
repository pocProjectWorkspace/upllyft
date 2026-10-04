// apps/api/src/auth/dto/forgot-password.dto.ts
import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class ForgotPasswordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  email: string;

  @IsString()
  captcha: string;

  /**
   * Signed JWT captcha token returned by /auth/captcha/generate. When
   * provided, the server verifies the user-typed captcha against this
   * token instead of (or in addition to) the cookie-based path. Recommended
   * for any new client.
   */
  @IsOptional()
  @IsString()
  captchaToken?: string;
}