import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DevelopmentalReviewsService } from './developmental-reviews.service';
import {
  CreateDevReviewDto,
  UpdateDevReviewDto,
  AcknowledgeDevReviewDto,
} from './dto/developmental-reviews.dto';

/** Staff-facing developmental reviews (F9). Every method re-checks the gate in the service. */
@ApiTags('developmental-reviews')
@Controller('facilities/:facilityId')
@UseGuards(JwtAuthGuard)
export class DevelopmentalReviewsController {
  constructor(private readonly reviews: DevelopmentalReviewsService) {}

  @Get('developmental-reviews/due')
  @ApiOperation({ summary: 'Children in the review age band with no review yet' })
  due(@Req() req: any, @Param('facilityId') facilityId: string) {
    return this.reviews.due(req.user, facilityId);
  }

  @Get('children/:childId/developmental-reviews')
  @ApiOperation({ summary: 'Developmental reviews for this child (staff view)' })
  list(@Req() req: any, @Param('facilityId') facilityId: string, @Param('childId') childId: string) {
    return this.reviews.listForFacility(req.user, facilityId, childId);
  }

  @Post('children/:childId/developmental-reviews')
  @ApiOperation({ summary: 'Assemble a developmental review from the recorded screening' })
  create(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('childId') childId: string,
    @Body() dto: CreateDevReviewDto,
  ) {
    return this.reviews.create(req.user, facilityId, childId, dto);
  }

  @Patch('developmental-reviews/:reviewId')
  @ApiOperation({ summary: 'Edit the review summary before sharing' })
  update(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateDevReviewDto,
  ) {
    return this.reviews.updateSummary(req.user, facilityId, reviewId, dto);
  }

  @Post('developmental-reviews/:reviewId/share')
  @ApiOperation({ summary: 'Share the review with the guardian' })
  share(@Req() req: any, @Param('facilityId') facilityId: string, @Param('reviewId') reviewId: string) {
    return this.reviews.share(req.user, facilityId, reviewId);
  }
}

/** GUARDIAN-facing. Only SHARED reviews. */
@ApiTags('developmental-reviews')
@Controller('children/:childId/developmental-reviews')
@UseGuards(JwtAuthGuard)
export class GuardianDevelopmentalReviewsController {
  constructor(private readonly reviews: DevelopmentalReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Developmental reviews a nursery has shared about your child' })
  list(@Req() req: any, @Param('childId') childId: string) {
    return this.reviews.listForGuardian(req.user, childId);
  }

  @Post(':reviewId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a shared review (optionally with a response)' })
  acknowledge(
    @Req() req: any,
    @Param('childId') childId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: AcknowledgeDevReviewDto,
  ) {
    return this.reviews.acknowledge(req.user, childId, reviewId, dto);
  }
}
