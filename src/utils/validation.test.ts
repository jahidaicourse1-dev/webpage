import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCsvCell,
  sanitizePlainText,
  sanitizeUrl,
  validateContactInput,
  validatePasswordStrength,
  validateProjectInput,
} from './validation';

test('sanitizePlainText removes control characters and normalizes spaces', () => {
  assert.equal(sanitizePlainText('  Hello\x00\x07   World \n '), 'Hello World');
  assert.equal(sanitizePlainText('Line 1\nLine 2\x00', true), 'Line 1\nLine 2');
});

test('sanitizeUrl allows http/https and relative uploads/assets but blocks javascript:', () => {
  assert.equal(sanitizeUrl('https://example.com/demo'), 'https://example.com/demo');
  assert.equal(sanitizeUrl('/uploads/abc.png'), '/uploads/abc.png');
  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeUrl('data:text/html,<script>'), '');
});

test('validateContactInput enforces field rules and detects honeypot', () => {
  const invalid = validateContactInput({
    fullName: 'A',
    email: 'not-an-email',
    subject: '',
    message: 'short',
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.fullName);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.subject);
  assert.ok(invalid.errors.message);

  const valid = validateContactInput({
    fullName: 'Rahim Uddin',
    email: 'Rahim@Example.COM',
    subject: 'Workflow consultation',
    message: 'Looking to automate our Google Sheets reporting pipeline.',
    website: '',
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.data?.email, 'rahim@example.com');
  assert.equal(valid.data?.honeypotTriggered, false);

  const bot = validateContactInput({
    fullName: 'Bot User',
    email: 'bot@example.com',
    subject: 'Spam offer',
    message: 'Click here to claim your prize right now.',
    website: 'https://spam.example',
  });
  assert.equal(bot.data?.honeypotTriggered, true);
});

test('validateProjectInput rejects malicious URLs and keeps valid projects', () => {
  const bad = validateProjectInput({
    title: 'Test Project',
    description: 'A valid description with enough characters.',
    liveLink: 'javascript:alert(1)',
    tags: ['n8n'],
    published: true,
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.liveLink);

  const good = validateProjectInput({
    title: 'EduGenius AI',
    description: 'An AI-supported educational platform for study workflows.',
    tags: ['Gemini API', 'Web Development'],
    liveLink: 'https://example.com',
    imageUrl: '/uploads/sample.png',
    published: true,
  });
  assert.equal(good.ok, true);
  assert.equal(good.data?.tags.length, 2);
});

test('validatePasswordStrength requires length and character diversity', () => {
  assert.ok(validatePasswordStrength('short1A'));
  assert.ok(validatePasswordStrength('alllowercase123'));
  assert.equal(validatePasswordStrength('StrongPass2026'), null);
});

test('escapeCsvCell neutralizes formula injection and quotes commas', () => {
  assert.equal(escapeCsvCell('=CMD("calc")'), `"'=CMD(""calc"")"`);
  assert.equal(escapeCsvCell('+1234'), `"'+1234"`);
  assert.equal(escapeCsvCell('Hello, World'), `"""Hello, World"""`.replace('"""', '"').replace('"""', '"'));
  assert.equal(escapeCsvCell('Hello, World'), '"Hello, World"');
});
