import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsentTemplateService } from './consent-template.service';
import { CreateConsentTemplateDto, PublishConsentVersionDto } from './dto/clinic-intake.dto';

@Controller('consent-templates')
@UseGuards(JwtAuthGuard)
export class ConsentTemplateController {
  constructor(private templates: ConsentTemplateService) {}

  @Get()
  list(@Query('clinicId') clinicId?: string) {
    return this.templates.listTemplates(clinicId);
  }

  @Post()
  create(@Body() dto: CreateConsentTemplateDto) {
    return this.templates.createTemplate(dto);
  }

  @Post(':templateId/versions')
  publishVersion(@Param('templateId') templateId: string, @Body() dto: PublishConsentVersionDto) {
    return this.templates.publishVersion(templateId, dto);
  }
}
