export class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'HttpError';
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
