import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSessionToken,
  RateLimiter,
  verifyFileMagicBytes,
  verifySessionToken,
  verifyTimingSafeEqual,
} from './security';

test('verifyFileMagicBytes validates PNG, JPEG, WebP, and PDF headers', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  assert.deepEqual(verifyFileMagicBytes(png, 'image'), { ok: true, ext: '.png', mime: 'image/png' });

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(verifyFileMagicBytes(jpeg, 'image'), { ok: true, ext: '.jpg', mime: 'image/jpeg' });

  const fakeImage = Buffer.from('<svg><script>alert(1)</script></svg>');
  assert.equal(verifyFileMagicBytes(fakeImage, 'image').ok, false);

  const pdf = Buffer.from('%PDF-1.7 sample pdf payload');
  assert.deepEqual(verifyFileMagicBytes(pdf, 'pdf'), { ok: true, ext: '.pdf', mime: 'application/pdf' });
  assert.equal(verifyFileMagicBytes(png, 'pdf').ok, false);
});

test('createSessionToken and verifySessionToken reject tampering and expiry', () => {
  const secret = 'test-secret-key-with-sufficient-length';
  const now = 1_700_000_000_000;
  const token = createSessionToken('jahid', secret, 60_000);
  const parsed = verifySessionToken(token, secret, now);
  assert.equal(parsed?.sub, 'jahid');

  const tampered = token.slice(0, -2) + 'xx';
  assert.equal(verifySessionToken(tampered, secret, now), null);

  assert.equal(verifySessionToken(token, secret, Date.now() + 120_000), null);
});

test('verifyTimingSafeEqual checks exact byte equality', () => {
  assert.equal(verifyTimingSafeEqual('abc123', 'abc123'), true);
  assert.equal(verifyTimingSafeEqual('abc123', 'abc124'), false);
  assert.equal(verifyTimingSafeEqual('abc', 'abcd'), false);
});

test('RateLimiter enforces maxAttempts and temporary lockout', () => {
  const limiter = new RateLimiter(3, 60_000, 120_000);
  const t0 = 1_000_000;

  assert.equal(limiter.consume('ip1', t0).allowed, true);
  assert.equal(limiter.consume('ip1', t0 + 100).allowed, true);
  assert.equal(limiter.consume('ip1', t0 + 200).allowed, true);

  const blocked = limiter.check('ip1', t0 + 300);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 119);

  // After lockout expires
  assert.equal(limiter.check('ip1', t0 + 130_000).allowed, true);
});
