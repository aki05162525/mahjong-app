export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "internal_error";

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal_error: 500,
};

export class AppError extends Error {
  public readonly status: number;
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError("bad_request", message, details);
export const unauthorized = (message = "ログインが必要です") =>
  new AppError("unauthorized", message);
export const forbidden = (message = "権限がありません") => new AppError("forbidden", message);
export const notFound = (message: string) => new AppError("not_found", message);
export const conflict = (message: string) => new AppError("conflict", message);
export const rateLimited = (message = "リクエストが多すぎます") =>
  new AppError("rate_limited", message);
export const internalError = (message = "内部エラー") => new AppError("internal_error", message);
