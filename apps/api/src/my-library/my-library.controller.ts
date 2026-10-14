import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MyLibraryService } from './my-library.service';

@ApiTags('my-library')
@Controller('my-library')
@UseGuards(JwtAuthGuard)
export class MyLibraryController {
  constructor(private readonly myLibrary: MyLibraryService) {}

  @Get('saved')
  saved(@Req() req: any) {
    return this.myLibrary.listSaved(req.user);
  }

  @Get('saved/refs')
  savedRefs(@Req() req: any) {
    return this.myLibrary.savedRefs(req.user);
  }

  @Post('saved/:kind/:id')
  save(@Req() req: any, @Param('kind') kind: string, @Param('id') id: string) {
    return this.myLibrary.save(req.user, kind, id);
  }

  @Delete('saved/:kind/:id')
  unsave(@Req() req: any, @Param('kind') kind: string, @Param('id') id: string) {
    return this.myLibrary.unsave(req.user, kind, id);
  }

  @Post('collections')
  createCollection(@Req() req: any, @Body() body: { name?: unknown }) {
    return this.myLibrary.createCollection(req.user, body?.name);
  }

  @Post('collections/:id/items')
  addToCollection(@Req() req: any, @Param('id') id: string, @Body() body: { savedIds?: unknown }) {
    return this.myLibrary.addToCollection(req.user, id, body?.savedIds);
  }

  @Get('creations')
  creations(@Req() req: any) {
    return this.myLibrary.listCreations(req.user);
  }
}
