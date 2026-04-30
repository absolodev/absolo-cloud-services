import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiErrorSchema, ERROR_CODES, type ApiError } from '@absolo/contracts/errors';
import { ZodValidationException } from './zod.pipe.js';

/**
 * Single global exception filter: every error response coming out of the
 * control plane is shaped as the canonical `ApiError` envelope from
 * `@absolo/contracts`.
 *
 * Inputs handled:
 * - `ZodValidationException` — produces `VALIDATION_FAILED` with field issues.
 * - `HttpException` — preserves status + message, infers code from status.
 * - Anything else — coerced to `INTERNAL_ERROR` 500 with no leak of details.
 *
 * The `requestId` always comes from `request.id` (set by `RequestIdHook`).
 */
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const requestId = request.id;

    const envelope = this.buildEnvelope(exception, requestId);

    // Internal errors deserve a stack trace in the log; client errors don't.
    if (envelope.status >= 500) {
      this.logger.error({ err: exception, requestId }, 'Unhandled exception');
    } else {
      this.logger.debug({ err: exception, requestId }, 'Client error');
    }

    // Defensively validate our own payload — surfaces drift between filter and contract.
    const validated = ApiErrorSchema.parse(envelope);

    void reply
      .status(envelope.status)
      .header('content-type', 'application/problem+json')
      .header('x-request-id', requestId)
      .send(validated);
  }

  private buildEnvelope(exception: unknown, requestId: string): ApiError {
    if (exception instanceof ZodValidationException) {
      return {
        type: 'https://absolo.cloud/errors/validation',
        title: 'Validation failed',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ERROR_CODES.VALIDATION_FAILED,
        requestId,
        errors: exception.zodError.issues.map((issue) => ({
          path: issue.path.map((p) => (typeof p === 'number' ? p : String(p))),
          code: issue.code,
          message: issue.message,
        })),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const detail =
        typeof response === 'string'
          ? response
          : (response as { message?: string }).message;
      return {
        type: `https://absolo.cloud/errors/${slugForStatus(status)}`,
        title: titleForStatus(status),
        status,
        code: codeForStatus(status),
        detail: typeof detail === 'string' ? detail : undefined,
        requestId,
      };
    }

    return {
      type: 'https://absolo.cloud/errors/internal',
      title: 'Internal server error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.INTERNAL_ERROR,
      requestId,
    };
  }
}

function slugForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'bad-request';
    case 401:
      return 'unauthenticated';
    case 403:
      return 'forbidden';
    case 404:
      return 'not-found';
    case 409:
      return 'conflict';
    case 412:
      return 'precondition-failed';
    case 413:
      return 'payload-too-large';
    case 422:
      return 'validation';
    case 429:
      return 'rate-limited';
    case 503:
      return 'unavailable';
    default:
      return 'error';
  }
}

function titleForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Bad request';
    case 401:
      return 'Authentication required';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not found';
    case 409:
      return 'Conflict';
    case 412:
      return 'Precondition failed';
    case 413:
      return 'Payload too large';
    case 422:
      return 'Validation failed';
    case 429:
      return 'Rate limited';
    case 503:
      return 'Service unavailable';
    default:
      return 'Request failed';
  }
}

function codeForStatus(status: number): string {
  switch (status) {
    case 401:
      return ERROR_CODES.AUTHENTICATION_REQUIRED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 409:
      return ERROR_CODES.CONFLICT;
    case 412:
      return ERROR_CODES.PRECONDITION_FAILED;
    case 413:
      return ERROR_CODES.PAYLOAD_TOO_LARGE;
    case 422:
      return ERROR_CODES.VALIDATION_FAILED;
    case 429:
      return ERROR_CODES.RATE_LIMITED;
    case 503:
      return ERROR_CODES.SERVICE_UNAVAILABLE;
    default:
      return status >= 500 ? ERROR_CODES.INTERNAL_ERROR : 'BAD_REQUEST';
  }
}
