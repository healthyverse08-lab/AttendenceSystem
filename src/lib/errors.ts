// ============================================================
// Centralized Error Handling
// Standardized error types and HTTP status codes for TSAMS.
// Never expose internal implementation details or stack traces.
// ============================================================

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SESSION_EXPIRED'
  | 'INTERNAL_ERROR';

export interface ApiError {
  code: ErrorCode;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

const ERROR_MAP: Record<ErrorCode, { status: number; message: string }> = {
  UNAUTHORIZED: { status: 401, message: 'Authentication required.' },
  FORBIDDEN: { status: 403, message: 'You do not have permission to perform this action.' },
  NOT_FOUND: { status: 404, message: 'The requested resource was not found.' },
  CONFLICT: { status: 409, message: 'This action conflicts with existing data.' },
  VALIDATION_ERROR: { status: 422, message: 'The provided input is invalid.' },
  RATE_LIMITED: { status: 429, message: 'Too many requests. Please try again later.' },
  SESSION_EXPIRED: { status: 401, message: 'Your session has expired. Please sign in again.' },
  INTERNAL_ERROR: { status: 500, message: 'An unexpected error occurred. Please try again.' },
};

export function createError(code: ErrorCode, message?: string, details?: Record<string, unknown>): ApiError {
  const base = ERROR_MAP[code];
  return {
    code,
    message: message ?? base.message,
    status: base.status,
    details,
  };
}

export function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'code' in err && 'status' in err;
}

// Map Supabase/Postgres error codes to our ApiError types
export function mapDatabaseError(err: { code?: string; message?: string }): ApiError {
  const pgCode = err.code ?? '';
  if (pgCode === '23505') return createError('CONFLICT', 'This record already exists.');
  if (pgCode === '23503') return createError('VALIDATION_ERROR', 'Referenced record does not exist.');
  if (pgCode === '42501') return createError('FORBIDDEN');
  if (pgCode === 'PGRST116') return createError('NOT_FOUND');
  return createError('INTERNAL_ERROR');
}

// User-friendly error messages for common scenarios
export const ERROR_MESSAGES = {
  UNAUTHORIZED_DOMAIN: 'Access denied. Use an official Techspire College Google Account.',
  UNREGISTERED: 'Your account has not been registered by the college administrator.',
  ACCOUNT_SUSPENDED: 'Your account has been suspended. Contact an administrator.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  QR_EXPIRED: 'QR code has expired. Scan the latest code.',
  QR_INVALID: 'Invalid QR code. Please scan a valid attendance code.',
  ATTENDANCE_CLOSED: 'Attendance window has closed.',
  ATTENDANCE_DUPLICATE: 'Attendance has already been recorded.',
  NOT_ENROLLED: 'You are not enrolled in this subject.',
  WRONG_SECTION: 'You are not in a section selected for this session.',
  OUTSIDE_NETWORK: 'Attendance submitted outside approved campus network.',
  INVALID_SESSION: 'Attendance session not found or inactive.',
} as const;

export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred.'): string {
  if (isApiError(err)) return err.message;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'string') return err;
  return fallback;
}
