import type { ApiErrorCode } from "../shared/types";

export class AppError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export const HTTP_STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  NETWORK_ERROR: 504,
};
