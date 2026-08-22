import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LibraryResourcesService, RESOURCE_TYPES } from './library-resources.service';

@ApiTags('library-resources')
@Controller('library-resources')
@UseGuards(JwtAuthGuard)
export class LibraryResourcesController {
  constructor(private readonly libraryResources: LibraryResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Resources visible to me (platform-wide + my organizations)' })
  list(
    @Req() req: any,
    @Query('resourceType') resourceType?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.libraryResources.list(req.user, { resourceType, tag, search, organizationId });
  }

  @Get('types')
  @ApiOperation({ summary: 'The allowed resource type tags' })
  types() {
    return { types: RESOURCE_TYPES };
  }

  @Post()
  @ApiOperation({ summary: 'Upload a resource (platform admins or org admins)' })
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Req() req: any,
    @UploadedFile() file: any,
    @Body()
    body: {
      title?: string;
      description?: string;
      resourceType?: string;
      tags?: string;
      scope?: string;
      organizationId?: string;
    },
  ) {
    return this.libraryResources.create(req.user, file, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a resource (uploader, platform admin or that org’s admin)' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.libraryResources.remove(req.user, id);
  }
}
