import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

import type { Logger } from '../shared/logger.js';

export function requestContext(logger: Logger): RequestHandler {
  return (request, response, next) => {
    request.requestId = request.header('x-request-id') ?? randomUUID();
    response.setHeader('x-request-id', request.requestId);
    const startedAt = Date.now();
    response.on('finish', () => {
      logger.info('http_request_completed', {
        requestId: request.requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
    next();
  };
}
