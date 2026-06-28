export class AppError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly expose: boolean;
  public readonly statusCode: number;

  public constructor(
    statusCode: number,
    code: string,
    message: string,
    options: { details?: unknown; expose?: boolean } = {}
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.expose = options.expose ?? statusCode < 500;
  }
}
