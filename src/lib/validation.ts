// ============================================================
// Centralized Input Validation
// All validation functions return { valid, error } tuples.
// Never trust client-side validation — these are used at
// system boundaries (forms, user input) for UX, but server-side
// validation in edge functions is authoritative.
// ============================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function validateUUID(value: unknown, field = 'id'): ValidationResult {
  if (!value || typeof value !== 'string') return { valid: false, error: `${field} is required.` };
  if (!UUID_RE.test(value)) return { valid: false, error: `${field} must be a valid UUID.` };
  return { valid: true };
}

export function validateEmail(value: unknown): ValidationResult {
  if (!value || typeof value !== 'string') return { valid: false, error: 'Email is required.' };
  if (!EMAIL_RE.test(value)) return { valid: false, error: 'Invalid email format.' };
  return { valid: true };
}

export function validateRequiredString(value: unknown, field: string, maxLen = 255): ValidationResult {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return { valid: false, error: `${field} is required.` };
  }
  if (value.length > maxLen) return { valid: false, error: `${field} must be at most ${maxLen} characters.` };
  return { valid: true };
}

export function validateOptionalString(value: unknown, field: string, maxLen = 255): ValidationResult {
  if (value === null || value === undefined || value === '') return { valid: true };
  if (typeof value !== 'string') return { valid: false, error: `${field} must be a string.` };
  if (value.length > maxLen) return { valid: false, error: `${field} must be at most ${maxLen} characters.` };
  return { valid: true };
}

export function validateDate(value: unknown, field = 'date'): ValidationResult {
  if (!value || typeof value !== 'string') return { valid: false, error: `${field} is required.` };
  if (!ISO_DATE_RE.test(value)) return { valid: false, error: `${field} must be a valid ISO date.` };
  const d = new Date(value);
  if (isNaN(d.getTime())) return { valid: false, error: `${field} is not a valid date.` };
  return { valid: true };
}

export function validateDateRange(startDate: unknown, endDate: unknown): ValidationResult {
  const start = validateDate(startDate, 'start_date');
  if (!start.valid) return start;
  const end = validateDate(endDate, 'end_date');
  if (!end.valid) return end;
  if (new Date(endDate as string) < new Date(startDate as string)) {
    return { valid: false, error: 'end_date must be after start_date.' };
  }
  return { valid: true };
}

export function validateInt(value: unknown, field: string, min?: number, max?: number): ValidationResult {
  if (value === null || value === undefined) return { valid: false, error: `${field} is required.` };
  const n = Number(value);
  if (!Number.isInteger(n)) return { valid: false, error: `${field} must be an integer.` };
  if (min !== undefined && n < min) return { valid: false, error: `${field} must be at least ${min}.` };
  if (max !== undefined && n > max) return { valid: false, error: `${field} must be at most ${max}.` };
  return { valid: true };
}

export function validateEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): ValidationResult {
  if (!value || typeof value !== 'string') return { valid: false, error: `${field} is required.` };
  if (!allowed.includes(value as T)) return { valid: false, error: `${field} must be one of: ${allowed.join(', ')}.` };
  return { valid: true };
}

// Sanitize string input to prevent XSS when rendering user content.
// Note: React already escapes content by default — this is a defense
// in depth for any dangerouslySetInnerHTML paths.
export function sanitizeString(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function validatePagination(page: unknown, pageSize: unknown): { page: number; pageSize: number } | ValidationResult {
  const p = Number(page);
  const ps = Number(pageSize);
  if (!Number.isInteger(p) || p < 1) return { valid: false, error: 'page must be a positive integer.' };
  if (!Number.isInteger(ps) || ps < 1 || ps > 200) return { valid: false, error: 'pageSize must be between 1 and 200.' };
  return { page: p, pageSize: ps };
}
