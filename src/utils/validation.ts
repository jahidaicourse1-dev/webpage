export interface ContactInput {
  fullName: string;
  email: string;
  subject: string;
  message: string;
  website?: string; // honeypot
}

export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  errors: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Removes ASCII control chars (except newlines/tabs where allowed) and trims whitespace.
 */
export function sanitizePlainText(input: unknown, allowNewlines = false): string {
  if (typeof input !== 'string') return '';
  const cleaned = allowNewlines
    ? input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    : input.replace(/[\x00-\x1F\x7F]/g, ' ');
  return cleaned.replace(/[ \t]+/g, ' ').trim();
}

export function sanitizeUrl(input: unknown): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/assets/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function validateContactInput(raw: unknown): ValidationResult<{
  fullName: string;
  email: string;
  subject: string;
  message: string;
  honeypotTriggered: boolean;
}> {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const honeypot = typeof obj.website === 'string' ? obj.website.trim() : '';

  const fullName = sanitizePlainText(obj.fullName, false);
  const email = sanitizePlainText(obj.email, false).toLowerCase();
  const subject = sanitizePlainText(obj.subject, false);
  const message = sanitizePlainText(obj.message, true);

  const errors: Record<string, string> = {};

  if (fullName.length < 2 || fullName.length > 100) {
    errors.fullName = 'Please enter your full name (2 to 100 characters).';
  }
  if (!EMAIL_RE.test(email) || email.length > 160) {
    errors.email = 'Please enter a valid email address.';
  }
  if (subject.length < 2 || subject.length > 150) {
    errors.subject = 'Please enter a subject (2 to 150 characters).';
  }
  if (message.length < 10 || message.length > 3000) {
    errors.message = 'Please enter a message (10 to 3000 characters).';
  }

  return {
    ok: Object.keys(errors).length === 0,
    data: {
      fullName,
      email,
      subject,
      message,
      honeypotTriggered: honeypot.length > 0,
    },
    errors,
  };
}

export function validateProjectInput(raw: unknown): ValidationResult<{
  title: string;
  description: string;
  tags: string[];
  imageUrl: string;
  liveLink: string;
  published: boolean;
}> {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const title = sanitizePlainText(obj.title, false);
  const description = sanitizePlainText(obj.description, true);
  const rawTags = Array.isArray(obj.tags) ? obj.tags : [];
  const tags = rawTags
    .map((t) => sanitizePlainText(t, false))
    .filter((t) => t.length > 0 && t.length <= 40)
    .slice(0, 10);

  const rawImageUrl = typeof obj.imageUrl === 'string' ? obj.imageUrl.trim() : '';
  const imageUrl = rawImageUrl ? sanitizeUrl(rawImageUrl) : '';
  const rawLiveLink = typeof obj.liveLink === 'string' ? obj.liveLink.trim() : '';
  const liveLink = rawLiveLink ? sanitizeUrl(rawLiveLink) : '';
  const published = Boolean(obj.published);

  const errors: Record<string, string> = {};

  if (title.length < 2 || title.length > 120) {
    errors.title = 'Project title must be between 2 and 120 characters.';
  }
  if (description.length < 10 || description.length > 1500) {
    errors.description = 'Project description must be between 10 and 1500 characters.';
  }
  if (rawImageUrl && !imageUrl) {
    errors.imageUrl = 'Image URL must be an uploaded asset or valid http/https URL.';
  }
  if (rawLiveLink && !liveLink) {
    errors.liveLink = 'Live link must be a valid http:// or https:// URL.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    data: {
      title,
      description,
      tags,
      imageUrl,
      liveLink,
      published,
    },
    errors,
  };
}

export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== 'string' || password.length < 10) {
    return 'Password must be at least 10 characters long.';
  }
  if (password.length > 128) {
    return 'Password must be 128 characters or fewer.';
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasUpper || !hasLower || !hasDigit) {
    return 'Password must include uppercase, lowercase, and at least one number.';
  }
  return null;
}

/**
 * Escapes CSV cell values and neutralizes spreadsheet formula injection (=, +, -, @, tab, cr).
 */
export function escapeCsvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  const escaped = safe.replace(/"/g, '""');
  return `"${escaped}"`;
}
