import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MomentsService } from './moments.service';
import {
  CreateMomentDto,
  ListMomentsQueryDto,
  InterpretMomentDto,
  UpdateInsightStatusDto,
} from './dto/moments.dto';

/**
 * Everyday Moments — guardian-facing throughout. Every method gates on the guardian
 * relationship inside the service; there is no staff/facility path to a moment.
 */
@ApiTags('moments')
@Controller('children/:childId/moments')
@UseGuards(JwtAuthGuard)
export class MomentsController {
  constructor(private readonly moments: MomentsService) {}

  @Get()
  @ApiOperation({ summary: "A guardian's moments feed for their child" })
  list(
    @Req() req: any,
    @Param('childId') childId: string,
    @Query() query: ListMomentsQueryDto,
  ) {
    return this.moments.list(req.user, childId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Capture a moment (only the text is required)' })
  create(
    @Req() req: any,
    @Param('childId') childId: string,
    @Body() dto: CreateMomentDto,
  ) {
    return this.moments.create(req.user, childId, dto);
  }

  @Post('interpret')
  @ApiOperation({ summary: "Mira's proposed interpretation of a note — nothing is saved" })
  interpret(
    @Req() req: any,
    @Param('childId') childId: string,
    @Body() dto: InterpretMomentDto,
  ) {
    return this.moments.interpret(req.user, childId, dto);
  }

  @Delete(':momentId')
  @ApiOperation({ summary: 'Remove a moment' })
  remove(
    @Req() req: any,
    @Param('childId') childId: string,
    @Param('momentId') momentId: string,
  ) {
    return this.moments.remove(req.user, childId, momentId);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Things Mira has noticed across recent moments (volume-governed)' })
  insights(@Req() req: any, @Param('childId') childId: string) {
    return this.moments.getInsights(req.user, childId);
  }

  @Patch('insights/:insightId')
  @ApiOperation({ summary: 'Keep watching / share / dismiss an insight' })
  updateInsight(
    @Req() req: any,
    @Param('childId') childId: string,
    @Param('insightId') insightId: string,
    @Body() dto: UpdateInsightStatusDto,
  ) {
    return this.moments.updateInsightStatus(req.user, childId, insightId, dto);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Progress areas grouped by status (watch / improving / …)' })
  progress(@Req() req: any, @Param('childId') childId: string) {
    return this.moments.getProgress(req.user, childId);
  }

  @Get('progress/:domain')
  @ApiOperation({ summary: 'One area in depth: trend + evidence log with source attribution' })
  areaDetail(
    @Req() req: any,
    @Param('childId') childId: string,
    @Param('domain') domain: string,
  ) {
    return this.moments.getAreaDetail(req.user, childId, domain);
  }
}
