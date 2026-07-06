import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseAccessGuard, CaseAccess } from '../cases/guards/case-access.guard';
import { AssessmentReviewsService } from './assessment-reviews.service';
import {
  CreateAssessmentReviewDto,
  UpdateAssessmentReviewDto,
  AddDisciplineDto,
  UpdateDisciplineDto,
  ShareReportDto,
} from './dto/assessment-reviews.dto';

@Controller('cases/:caseId/assessment-reviews')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class AssessmentReviewsController {
  constructor(private reviews: AssessmentReviewsService) {}

  @Get()
  @CaseAccess('view')
  list(@Param('caseId') caseId: string) {
    return this.reviews.list(caseId);
  }

  @Get(':id')
  @CaseAccess('view')
  get(@Param('caseId') caseId: string, @Param('id') id: string) {
    return this.reviews.get(caseId, id);
  }

  @Post()
  @CaseAccess('edit')
  create(@Param('caseId') caseId: string, @Body() dto: CreateAssessmentReviewDto, @Req() req: any) {
    return this.reviews.create(caseId, req.user.id, dto);
  }

  @Patch(':id')
  @CaseAccess('edit')
  update(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentReviewDto,
  ) {
    return this.reviews.update(caseId, id, dto);
  }

  @Post(':id/disciplines')
  @CaseAccess('edit')
  addDiscipline(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @Body() dto: AddDisciplineDto,
  ) {
    return this.reviews.addDiscipline(caseId, id, dto);
  }

  @Patch(':id/disciplines/:rowId')
  @CaseAccess('edit')
  updateDiscipline(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @Param('rowId') rowId: string,
    @Body() dto: UpdateDisciplineDto,
  ) {
    return this.reviews.updateDiscipline(caseId, id, rowId, dto);
  }

  @Post(':id/draft-report')
  @CaseAccess('edit')
  draftReport(@Param('caseId') caseId: string, @Param('id') id: string) {
    return this.reviews.draftReport(caseId, id);
  }

  @Post(':id/share')
  @CaseAccess('edit')
  share(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @Body() dto: ShareReportDto,
    @Req() req: any,
  ) {
    return this.reviews.share(caseId, req.user.id, id, dto);
  }
}
