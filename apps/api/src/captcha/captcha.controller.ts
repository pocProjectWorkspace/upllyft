import { Controller, Get, Post, Body, Session } from '@nestjs/common';
import { CaptchaService } from './captcha.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('captcha')
@Controller('captcha')
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  @Get('generate')
  generateCaptcha(@Session() session: any) {
    // 🔥 Use the more complex captcha
    const { text, image } = this.captchaService.generateCaptcha();
    
    // Store in session
    session.captcha = text;
    
    console.log('🔐 Generated captcha:', text); // For debugging (remove in production)
    
    return { image };
  }

  // 🔥 Optional: Add math captcha endpoint
  @Get('generate-math')
  generateMathCaptcha(@Session() session: any) {
    const { text, image } = this.captchaService.generateMathCaptcha();
    session.captcha = text;
    console.log('🔐 Generated math captcha answer:', text);
    return { image };
  }
}