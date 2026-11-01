import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../shared/errors.js';
import type { Logger } from '../shared/logger.js';

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error, request, response, next) => {
    void next;
    if (error instanceof ZodError) {
      response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          requestId: request.requestId,
          details: error.flatten().fieldErrors,
        },
      });
      return;
    }

    if (error instanceof AppError) {
      response.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          requestId: request.requestId,
          details: error.details,
        },
      });
      return;
    }

    logger.error('unhandled_error', {
      requestId: request.requestId,
      error: error instanceof Error ? error.message : error,
    });
    response.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        requestId: request.requestId,
      },
    });
  };
}
