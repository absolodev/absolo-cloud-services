import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, type ZodSchema } from 'zod';

/**
 * Validates and parses a request body / query / params against a Zod schema.
 *
 * Use as a *parameter pipe* attached via `@Body(new ZodPipe(MySchema))` so
 * each controller binds its own contract from `@absolo/contracts`.
 *
 * On failure, throws `BadRequestException` carrying the issues; the global
 * `ApiErrorFilter` converts that into the canonical `ApiError` envelope.
 */
@Injectable()
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ZodValidationException(result.error);
    }
    return result.data;
  }
}

/**
 * Lightweight wrapper so the global filter can recognise the source.
 * Avoids depending on the concrete `BadRequestException` shape elsewhere.
 */
export class ZodValidationException extends BadRequestException {
  constructor(public readonly zodError: ZodError) {
    super({
      title: 'Validation failed',
      issues: zodError.issues,
    });
  }
}
