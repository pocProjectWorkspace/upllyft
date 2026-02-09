import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePaymentIntentDto {
    @IsString()
    bookingId: string;

    @IsNumber()
    @Min(0)
    amount: number;

    @IsString()
    @IsOptional()
    currency?: string = 'USD';
}

export class CreateStripeAccountDto {
    @IsString()
    email: string;

    @IsString()
    @IsOptional()
    businessName?: string;
}

export class ProcessRefundDto {
    @IsString()
    bookingId: string;

    @IsString()
    cancelledBy: string;

    @IsString()
    @IsOptional()
    reason?: string;
}
