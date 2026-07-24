import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CaptchaModule } from '../captcha/captcha.module';
import { PublicIntakeController } from './public-intake.controller';
import { PublicIntakeService } from './public-intake.service';

@Module({
  imports: [
    CaptchaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
    }),
  ],
  controllers: [PublicIntakeController],
  providers: [PublicIntakeService],
})
export class PublicIntakeModule {}
