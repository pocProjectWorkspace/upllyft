import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { PackageService } from './package.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
    CreatePackageDto,
    PurchasePackageDto,
    UsePackageSessionDto,
    PackageResponseDto,
    PackagePurchaseResponseDto,
} from './dto/package.dto';

@Controller('marketplace/packages')
export class PackageController {
    constructor(private packageService: PackageService) { }

    /**
     * Create a session package (organization)
     */
    @Post()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async createPackage(@Body() dto: CreatePackageDto): Promise<PackageResponseDto> {
        return this.packageService.createPackage(dto);
    }

    /**
     * Get packages for an organization
     */
    @Get('organization/:organizationId')
    async getOrganizationPackages(
        @Param('organizationId') organizationId: string,
        @Query('includeInactive') includeInactive?: string,
    ): Promise<PackageResponseDto[]> {
        return this.packageService.getOrganizationPackages(
            organizationId,
            includeInactive === 'true',
        );
    }

    /**
     * Purchase a package (patient)
     */
    @Post(':packageId/purchase')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async purchasePackage(
        @Param('packageId') packageId: string,
        @Body() dto: PurchasePackageDto,
        @Request() req: any,
    ): Promise<PackagePurchaseResponseDto> {
        return this.packageService.purchasePackage(packageId, req.user.userId, dto);
    }

    /**
     * Use a package session
     */
    @Post(':purchaseId/use')
    @UseGuards(JwtAuthGuard)
    async usePackageSession(
        @Param('purchaseId') purchaseId: string,
        @Body() dto: UsePackageSessionDto,
        @Request() req: any,
    ): Promise<PackagePurchaseResponseDto> {
        return this.packageService.usePackageSession(purchaseId, dto, req.user.userId);
    }

    /**
     * Get patient's packages
     */
    @Get('patient/:patientId')
    @UseGuards(JwtAuthGuard)
    async getPatientPackages(
        @Param('patientId') patientId: string,
        @Request() req: any,
        @Query('activeOnly') activeOnly?: string,
    ): Promise<PackagePurchaseResponseDto[]> {
        // Verify user is requesting their own packages
        if (patientId !== req.user.userId) {
            throw new Error('Unauthorized');
        }
        return this.packageService.getPatientPackages(patientId, activeOnly !== 'false');
    }
}
