import crypto from 'node:crypto';

export interface SessionPayload {
  sub: string;
  exp: number;
  nonce: string;
}

/**
 * Verifies magic bytes of uploaded images and PDFs so spoofed MIME headers are rejected.
 */
export function verifyFileMagicBytes(buffer: Buffer, kind: 'image' | 'pdf'): { ok: boolean; ext: string; mime: string } {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return { ok: false, ext: '', mime: '' };
  }

  if (kind === 'pdf') {
    if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
      return { ok: true, ext: '.pdf', mime: 'application/pdf' };
    }
    return { ok: false, ext: '', mime: '' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ok: true, ext: '.jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ok: true, ext: '.png', mime: 'image/png' };
  }

  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ok: true, ext: '.webp', mime: 'image/webp' };
  }

  return { ok: false, ext: '', mime: '' };
}

export function createSessionToken(username: string, secret: string, ttlMs: number): string {
  const payload: SessionPayload = {
    sub: username,
    exp: Date.now() + ttlMs,
    nonce: crypto.randomBytes(12).toString('hex'),
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string, secret: string, now = Date.now()): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed || typeof parsed.sub !== 'string' || typeof parsed.exp !== 'number') {
      return null;
    }
    if (parsed.exp <= now) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function verifyTimingSafeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

interface RateBucket {
  count: number;
  resetAt: number;
  lockedUntil: number;
}

export class RateLimiter {
  private buckets = new Map<string, RateBucket>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly lockoutMs: number;

  constructor(maxAttempts: number, windowMs: number, lockoutMs = 0) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.lockoutMs = lockoutMs;
  }

  check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const bucket = this.buckets.get(key);
    if (!bucket) return { allowed: true, retryAfterSeconds: 0 };

    if (bucket.lockedUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((bucket.lockedUntil - now) / 1000),
      };
    }

    if (bucket.resetAt <= now) {
      this.buckets.delete(key);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (bucket.count >= this.maxAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  consume(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const status = this.check(key, now);
    if (!status.allowed) return status;

    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
        lockedUntil: 0,
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    existing.count += 1;
    if (existing.count >= this.maxAttempts && this.lockoutMs > 0) {
      existing.lockedUntil = now + this.lockoutMs;
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }
}

export function hashIp(ip: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(ip || 'unknown').digest('hex').slice(0, 24);
}
