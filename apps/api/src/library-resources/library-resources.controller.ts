import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import {
  AUDIENCES,
  AUDIENCE_SEGMENTS,
  LibraryResourcesService,
  RESOURCE_TYPES,
} from './library-resources.service';

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
    @Query('scope') scope?: string,
  ) {
    return this.libraryResources.list(req.user, { resourceType, tag, search, organizationId, scope });
  }

  @Get('types')
  @ApiOperation({ summary: 'The allowed resource types, audiences and audience segments' })
  types() {
    return { types: RESOURCE_TYPES, audiences: AUDIENCES, segments: AUDIENCE_SEGMENTS };
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
      /** Platform resources: EVERYONE | ALL_ORGS | ORGS. Ignored for org resources. */
      audience?: string;
      /** Comma-separated organization ids, for audience ORGS. */
      organizationIds?: string;
      /** ALL | FAMILIES | STAFF */
      audienceSegment?: string;
      /** Org resources only: 'false' makes the file view-only. */
      downloadable?: string;
    },
  ) {
    return this.libraryResources.create(req.user, file, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit details and audience (uploader, platform admin or that org’s admin)' })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string | null;
      resourceType?: string;
      tags?: string | string[];
      audience?: string;
      organizationIds?: string | string[];
      audienceSegment?: string;
      downloadable?: boolean;
    },
  ) {
    return this.libraryResources.update(req.user, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a resource (uploader, platform admin or that org’s admin)' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.libraryResources.remove(req.user, id);
  }
}
