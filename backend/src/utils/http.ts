export class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export function handleControllerError(
  error: unknown,
  set: { status?: number | string },
  defaultMessage: string
): { error: string } {
  if (error instanceof HttpError) {
    set.status = error.statusCode;
    return { error: error.message };
  }

  set.status = 400;
  return { error: error instanceof Error ? error.message : defaultMessage };
}

export function formatErrorResponse(error: unknown, defaultMessage: string): { error: string } {
  return { error: error instanceof Error ? error.message : defaultMessage };
}
