import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger('ExceptionFilter');

    constructor(private readonly httpAdapterHost: HttpAdapterHost) { }

    catch(exception: any, host: ArgumentsHost): void {
        // In certain situations `httpAdapter` might not be available in the
        // constructor method, thus we should resolve it here.
        const { httpAdapter } = this.httpAdapterHost;

        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();

        const isHttpException = exception instanceof HttpException;

        const httpStatus = isHttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        // Only surface messages from intentional HttpExceptions (preserving the
        // class-validator error array). For everything else (raw Errors, Prisma
        // failures, etc.) return a generic message so internal detail — query
        // fragments, table/column names — never reaches the client.
        let message: unknown = 'Internal server error';
        if (isHttpException) {
            const exceptionResponse = exception.getResponse();
            message =
                typeof exceptionResponse === 'object' && exceptionResponse !== null
                    ? ((exceptionResponse as Record<string, unknown>).message ??
                        (exceptionResponse as Record<string, unknown>).error ??
                        exception.message)
                    : exceptionResponse;
        }

        const responseBody = {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(request),
            method: httpAdapter.getRequestMethod(request),
            message,
        };

        // Enhanced logging for errors
        this.logger.error(
            `[${httpAdapter.getRequestMethod(request)}] ${httpAdapter.getRequestUrl(request)}`,
        );

        // Log the full exception stack if it's a 500 error or if we want more detail
        if (httpStatus >= 500) {
            this.logger.error(exception);
            if (exception.stack) {
                this.logger.error(exception.stack);
            }
        } else {
            // For 4xx errors, we log the message and the response body
            this.logger.warn(`Response: ${JSON.stringify(responseBody)}`);
            if (exception?.response) {
                this.logger.warn(`Details: ${JSON.stringify(exception.response)}`);
            }
        }

        httpAdapter.reply(response, responseBody, httpStatus);
    }
}
