export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export interface PasswordCheckItem {
  id: string;
  label: string;
  met: boolean;
  optional?: boolean;
}

export interface PasswordStrengthReport {
  valid: boolean;
  error: string | null;
  score: number;
  strengthLabel: 'Weak' | 'Fair' | 'Good' | 'Strong';
  checks: PasswordCheckItem[];
}

export const ALLOWED_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{1,79}$/;
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export const PHONE_REGEX = /^\+?[0-9\s-]{10,15}$/;
export const ROLL_NO_REGEX = /^[A-Za-z0-9]{10,12}$/;
export const EMPLOYEE_ID_REGEX = /^[A-Za-z0-9-]{3,20}$/;
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Strips ASCII control characters and angle brackets (<, >) to neutralize
 * raw HTML/script fragments before persistence.
 */
export function sanitizeText(value: string): string {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim();
}

export function isInWhitelist<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

export function validateName(value: string, label = 'Full name'): string | null {
  const cleaned = sanitizeText(value);
  if (!cleaned) return `${label} is required.`;
  if (cleaned.length < 2 || cleaned.length > 80) {
    return `${label} must be between 2 and 80 characters.`;
  }
  if (!NAME_REGEX.test(cleaned)) {
    return `${label} may only contain letters, spaces, periods, hyphens, and apostrophes.`;
  }
  return null;
}

export function validateEmail(value: string, required = true): string | null {
  const cleaned = value.trim();
  if (!cleaned) return required ? 'Email address is required.' : null;
  if (cleaned.length > 254) return 'Email address must not exceed 254 characters.';
  if (!EMAIL_REGEX.test(cleaned)) return 'Enter a valid email address (e.g. user@arambh.edu).';
  return null;
}

export function validatePhone(value: string, required = false, label = 'Phone number'): string | null {
  const cleaned = value.trim();
  if (!cleaned) return required ? `${label} is required.` : null;
  if (!PHONE_REGEX.test(cleaned)) {
    return `${label} must be 10–15 characters using digits, spaces, hyphens, or leading +.`;
  }
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return `${label} must contain between 10 and 15 digits.`;
  }
  return null;
}

export function validateRollNo(value: string, required = true): string | null {
  const cleaned = value.trim();
  if (!cleaned) return required ? 'Roll number is required.' : null;
  if (!ROLL_NO_REGEX.test(cleaned)) {
    return 'Roll number must be 10–12 alphanumeric characters (letters and digits only).';
  }
  return null;
}

export function validateEmployeeId(value: string, required = true): string | null {
  const cleaned = value.trim();
  if (!cleaned) return required ? 'Employee ID is required.' : null;
  if (!EMPLOYEE_ID_REGEX.test(cleaned)) {
    return 'Employee ID must be 3–20 alphanumeric or hyphen characters.';
  }
  return null;
}

export function validateSemester(value: number | string): string | null {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 8) {
    return 'Semester must be a whole number between 1 and 8.';
  }
  return null;
}

export function validateAmount(
  value: number | string,
  { min = 0, max = 10_000_000, label = 'Amount' }: { min?: number; max?: number; label?: string } = {}
): string | null {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return `${label} must be a valid number.`;
  if (num < min || num > max) {
    return `${label} must be between ${min.toLocaleString()} and ${max.toLocaleString()}.`;
  }
  return null;
}

export function validateIsoDate(value: string, required = false, label = 'Date'): string | null {
  const cleaned = value.trim();
  if (!cleaned) return required ? `${label} is required.` : null;
  if (!ISO_DATE_REGEX.test(cleaned)) return `${label} must be in YYYY-MM-DD format.`;
  const parsed = new Date(`${cleaned}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== cleaned) {
    return `${label} is not a valid calendar date.`;
  }
  return null;
}

export function validateBloodGroup(value: string): string | null {
  const cleaned = value.trim().toUpperCase();
  if (!cleaned) return null;
  if (!isInWhitelist(cleaned, ALLOWED_BLOOD_GROUPS)) {
    return `Blood group must be one of: ${ALLOWED_BLOOD_GROUPS.join(', ')}.`;
  }
  return null;
}

export function validateFreeText(
  value: string,
  {
    required = false,
    minLen = 0,
    maxLen = 500,
    label = 'Field'
  }: { required?: boolean; minLen?: number; maxLen?: number; label?: string } = {}
): string | null {
  const raw = String(value ?? '');
  if (/[<>]/.test(raw) || /javascript:/i.test(raw)) {
    return `${label} cannot contain HTML tags (<, >) or script URIs.`;
  }
  const cleaned = sanitizeText(raw);
  if (!cleaned) return required ? `${label} is required.` : null;
  if (cleaned.length < minLen) {
    return `${label} must be at least ${minLen} characters.`;
  }
  if (cleaned.length > maxLen) {
    return `${label} must not exceed ${maxLen} characters.`;
  }
  return null;
}

export function validateSafeUrl(value: string, required = false, label = 'URL'): string | null {
  const cleaned = value.trim();
  if (!cleaned) return required ? `${label} is required.` : null;
  if (cleaned.length > 500) return `${label} must not exceed 500 characters.`;
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return `${label} must start with https:// or http://.`;
    }
    return null;
  } catch {
    return `Enter a valid ${label.toLowerCase()} starting with https:// or http://.`;
  }
}

export function getPasswordChecks(newPassword: string, currentPassword?: string): PasswordCheckItem[] {
  const checks: PasswordCheckItem[] = [
    { id: 'minLength', label: 'At least 8 characters', met: newPassword.length >= 8 },
    { id: 'recommendedLength', label: '12+ characters (recommended)', met: newPassword.length >= 12, optional: true },
    { id: 'upper', label: 'At least 1 uppercase letter (A–Z)', met: /[A-Z]/.test(newPassword) },
    { id: 'lower', label: 'At least 1 lowercase letter (a–z)', met: /[a-z]/.test(newPassword) },
    { id: 'digit', label: 'At least 1 number (0–9)', met: /[0-9]/.test(newPassword) },
    { id: 'special', label: 'At least 1 special character (!@#$%...)', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  if (currentPassword !== undefined) {
    checks.push({
      id: 'different',
      label: 'Different from your current password',
      met: Boolean(newPassword) && newPassword !== currentPassword
    });
  }

  return checks;
}

export function validatePasswordStrength(
  newPassword: string,
  confirmPassword: string,
  currentPassword?: string
): PasswordStrengthReport {
  const checks = getPasswordChecks(newPassword, currentPassword);
  const requiredChecks = checks.filter(c => !c.optional);
  const metCount = checks.filter(c => c.met).length;

  let strengthLabel: PasswordStrengthReport['strengthLabel'] = 'Weak';
  if (metCount >= checks.length) strengthLabel = 'Strong';
  else if (requiredChecks.every(c => c.met)) strengthLabel = 'Good';
  else if (metCount >= 3) strengthLabel = 'Fair';

  let error: string | null = null;
  if (newPassword.length > 128) {
    error = 'Password must not exceed 128 characters.';
  } else {
    const firstFailed = requiredChecks.find(c => !c.met);
    if (firstFailed) {
      error = `Password requirement not met: ${firstFailed.label}.`;
    } else if (newPassword !== confirmPassword) {
      error = 'New password and confirmation password do not match.';
    }
  }

  return {
    valid: error === null,
    error,
    score: metCount,
    strengthLabel,
    checks
  };
}

/**
 * Generates a 12-character temporary password meeting complexity rules using Web Crypto.
 */
export function generateCompliantTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;

  const pick = (pool: string) => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return pool[arr[0] % pool.length];
  };

  const chars = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(special),
    ...Array.from({ length: 8 }, () => pick(all))
  ];

  for (let i = chars.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function generateCompliantRollNo(): string {
  const year = new Date().getFullYear();
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const suffix = String(1000 + (arr[0] % 9000));
  return `AR${year}${suffix}`; // 10-character alphanumeric (matches ROLL_NO_REGEX)
}

export function mapAuthError(err: unknown): string {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as any).code) : '';
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-email'
  ) {
    return 'Invalid email or password.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Try again later.';
  }
  if (code === 'auth/user-disabled') {
    return 'This account has been disabled. Contact University Administration.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Check your connection and try again.';
  }
  return 'Unable to sign in. Please try again later.';
}

export function mapReauthPasswordError(err: unknown): string {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as any).code) : '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Current password is incorrect.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Try again later.';
  }
  if (code === 'auth/requires-recent-login') {
    return 'Session requires recent sign-in. Please log out and sign in again.';
  }
  if (code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements') {
    return 'New password does not meet institutional security requirements.';
  }
  return 'Unable to update password. Please try again later.';
}

export function maskEmail(email: string): string {
  const clean = email.trim().toLowerCase();
  const parts = clean.split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export async function hashIdentifier(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32);
  }
  return normalized.slice(0, 32);
}
