import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { FAQ_AUDIENCES, FaqService } from './faq.service';

export class FaqCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;

  @IsOptional()
  @IsIn(FAQ_AUDIENCES)
  audience?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class FaqItemDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  question?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  answer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * Public on purpose (no JwtAuthGuard): the Help Center at /help is readable by
 * logged-out visitors and search engines. Only published items are returned.
 */
@Controller('faq')
export class FaqController {
  constructor(private readonly faq: FaqService) {}

  @Get()
  list() {
    return this.faq.listPublished();
  }
}

/** The Help Center editor in the admin console (/admin/faq). */
@Controller('admin/faq')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class FaqAdminController {
  constructor(private readonly faq: FaqService) {}

  @Get()
  listAll() {
    return this.faq.listAll();
  }

  @Post('categories')
  createCategory(@Body() dto: FaqCategoryDto) {
    return this.faq.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: FaqCategoryDto) {
    return this.faq.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.faq.deleteCategory(id);
  }

  @Post('items')
  createItem(@Body() dto: FaqItemDto) {
    return this.faq.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: FaqItemDto) {
    return this.faq.updateItem(id, dto);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.faq.deleteItem(id);
  }
}
