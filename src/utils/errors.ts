import { AppError, AppErrorCode, Recoverability, ErrorCategory } from '../types/errors';

export function createAppError(
  code: AppErrorCode,
  message: string,
  recoverability: Recoverability,
  category: ErrorCategory,
  cause?: unknown
): AppError {
  return {
    code,
    message,
    recoverability,
    category,
    cause,
  };
}
