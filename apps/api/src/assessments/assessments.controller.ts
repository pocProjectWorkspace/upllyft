import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    Res,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { ReportGeneratorV2Service } from './report-generator-v2.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitTier1ResponsesDto } from './dto/submit-tier1.dto';
import { SubmitTier2ResponsesDto } from './dto/submit-tier2.dto';
import { ShareAssessmentDto } from './dto/share-assessment.dto';
import { AddAnnotationDto } from './dto/add-annotation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Assessments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessments')
export class AssessmentsController {
    constructor(
        private readonly assessmentsService: AssessmentsService,
        private readonly reportGeneratorV2: ReportGeneratorV2Service,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new assessment for a child' })
    @ApiResponse({ status: 201, description: 'Assessment created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async createAssessment(
        @Body() createAssessmentDto: CreateAssessmentDto,
        @Request() req,
    ) {
        return this.assessmentsService.createAssessment(
            createAssessmentDto,
            req.user.id,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get assessment by ID' })
    @ApiResponse({ status: 200, description: 'Assessment found' })
    @ApiResponse({ status: 404, description: 'Assessment not found' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async getAssessment(@Param('id') id: string, @Request() req) {
        return this.assessmentsService.getAssessment(id, req.user.id);
    }

    @Get('child/:childId')
    @ApiOperation({ summary: 'Get all assessments for a child' })
    @ApiResponse({ status: 200, description: 'Assessments retrieved' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async getChildAssessments(@Param('childId') childId: string, @Request() req) {
        return this.assessmentsService.getChildAssessments(childId, req.user.id);
    }

    @Get('history/:childId')
    @ApiOperation({ summary: 'Get screening history for longitudinal trend chart' })
    @ApiResponse({ status: 200, description: 'Screening history retrieved' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Child not found' })
    async getScreeningHistory(@Param('childId') childId: string, @Request() req) {
        return this.assessmentsService.getScreeningHistory(
            childId,
            req.user.id,
            req.user.role,
        );
    }

    @Get(':id/questionnaire/tier1')
    @ApiOperation({ summary: 'Get Tier 1 questionnaire for assessment' })
    @ApiResponse({ status: 200, description: 'Questionnaire retrieved' })
    @ApiResponse({ status: 404, description: 'Assessment not found' })
    async getTier1Questionnaire(@Param('id') id: string, @Request() req) {
        return this.assessmentsService.getTier1Questionnaire(id, req.user.id);
    }

    @Get(':id/questionnaire/tier2')
    @ApiOperation({ summary: 'Get Tier 2 questionnaire for flagged domains' })
    @ApiResponse({ status: 200, description: 'Questionnaire retrieved' })
    @ApiResponse({ status: 400, description: 'Tier 1 not completed or no flagged domains' })
    @ApiResponse({ status: 404, description: 'Assessment not found' })
    async getTier2Questionnaire(@Param('id') id: string, @Request() req) {
        return this.assessmentsService.getTier2Questionnaire(id, req.user.id);
    }

    @Post(':id/responses/tier1')
    @ApiOperation({ summary: 'Submit Tier 1 responses' })
    @ApiResponse({ status: 200, description: 'Responses submitted successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 404, description: 'Assessment not found' })
    async submitTier1Responses(
        @Param('id') id: string,
        @Body() submitTier1Dto: SubmitTier1ResponsesDto,
        @Request() req,
    ) {
        return this.assessmentsService.submitTier1Responses(
            id,
            submitTier1Dto,
            req.user.id,
        );
    }

    @Post(':id/responses/tier2')
    @ApiOperation({ summary: 'Submit Tier 2 responses' })
    @ApiResponse({ status: 200, description: 'Responses submitted successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 404, description: 'Assessment not found' })
    async submitTier2Responses(
        @Param('id') id: string,
        @Body() submitTier2Dto: SubmitTier2ResponsesDto,
        @Request() req,
    ) {
        return this.assessmentsService.submitTier2Responses(
            id,
            submitTier2Dto,
            req.user.id,
        );
    }

    @Post(':id/share')
    @ApiOperation({ summary: 'Share assessment with a therapist' })
    @ApiResponse({ status: 200, description: 'Assessment shared successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 404, description: 'Assessment or therapist not found' })
    async shareAssessment(
        @Param('id') id: string,
        @Body() shareDto: ShareAssessmentDto,
        @Request() req,
    ) {
        return this.assessmentsService.shareAssessment(id, shareDto, req.user.id);
    }

    @Get('shared-with-me/all')
    @ApiOperation({ summary: 'Get all assessments shared with current user (therapist)' })
    @ApiResponse({ status: 200, description: 'Shared assessments retrieved' })
    async getSharedAssessments(@Request() req) {
        return this.assessmentsService.getSharedAssessments(req.user.id);
    }

    @Post(':id/annotations')
    @ApiOperation({ summary: 'Add annotation to assessment (therapist only)' })
    @ApiResponse({ status: 200, description: 'Annotation added successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - no annotation permissions' })
    @ApiResponse({ status: 404, description: 'Assessment not found' })
    async addAnnotation(
        @Param('id') id: string,
        @Body() annotationDto: AddAnnotationDto,
        @Request() req,
    ) {
        return this.assessmentsService.addAnnotation(
            id,
            annotationDto,
            req.user.id,
        );
    }

    @Get(':id/report')
    @ApiOperation({ summary: 'Get assessment report data (JSON)' })
    @ApiResponse({ status: 200, description: 'Report data retrieved' })
    @ApiResponse({ status: 400, description: 'Assessment not completed' })
    @ApiResponse({ status: 404, description: 'Assessment not found' })
    async getReportData(@Param('id') id: string, @Request() req) {
        return this.assessmentsService.getReportData(id, req.user.id);
    }

    @Get(':id/report-v2')
    @ApiOperation({ summary: 'Get V2 assessment report data (JSON)' })
    @ApiResponse({ status: 200, description: 'Report data retrieved' })
    @ApiResponse({ status: 400, description: 'Assessment not completed' })
    @ApiResponse({ status: 404, description: 'Assessment not found' })
    async getReportV2(
        @Param('id') id: string,
        @Query('regenerate') regenerate: string,
        @Request() req,
    ) {
        // Verify access first
        await this.assessmentsService.getAssessment(id, req.user.id);

        return this.reportGeneratorV2.getOrGenerateV2Report(
            id,
            regenerate === 'true'
        );
    }

    @Get(':id/report-v2/download')
    @ApiOperation({ summary: 'Download V2 PDF report' })
    @ApiResponse({ status: 200, description: 'V2 PDF report downloaded' })
    @ApiResponse({ status: 400, description: 'Assessment not completed' })
    @ApiResponse({ status: 404, description: 'Assessment not found' })
    async downloadReportV2(
        @Param('id') id: string,
        @Request() req,
        @Res() res,
    ) {
        await this.assessmentsService.getAssessment(id, req.user.id);

        const result = await this.reportGeneratorV2.generateV2ReportPDF(id);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="assessment-report-${id}-v2.pdf"`,
        );
        res.send(result.pdfBuffer);
    }

    @Get(':id/report/download')
    @ApiOperation({ summary: 'Download PDF report' })
    @ApiResponse({ status: 200, description: 'PDF report downloaded' })
    @ApiResponse({ status: 400, description: 'Assessment not completed' })
    @ApiResponse({ status: 404, description: 'Assessment not found' })
    async downloadReport(
        @Param('id') id: string,
        @Query('type') type: 'summary' | 'detailed' = 'summary',
        @Request() req,
        @Res() res,
    ) {
        const result = await this.assessmentsService.downloadReport(
            id,
            type.toUpperCase() as 'SUMMARY' | 'DETAILED',
            req.user.id,
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="assessment-report-${id}-${type}.pdf"`,
        );
        res.send(result.pdfBuffer);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an assessment' })
    @ApiResponse({ status: 204, description: 'Assessment deleted successfully' })
    @ApiResponse({ status: 404, description: 'Assessment not found' })
    async deleteAssessment(@Param('id') id: string, @Request() req) {
        return this.assessmentsService.deleteAssessment(id, req.user.id);
    }

    @Delete(':id/share/:therapistId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Revoke assessment share from therapist' })
    @ApiResponse({ status: 204, description: 'Share revoked successfully' })
    @ApiResponse({ status: 404, description: 'Share not found' })
    async revokeShare(
        @Param('id') id: string,
        @Param('therapistId') therapistId: string,
        @Request() req,
    ) {
        return this.assessmentsService.revokeShare(id, therapistId, req.user.id);
    }
}
