import assert from 'node:assert/strict';
import test from 'node:test';
import { splitTextToWords } from './animations';
import { resolveInitialTheme } from './theme';

test('resolveInitialTheme prefers explicit stored theme over system setting', () => {
  assert.equal(resolveInitialTheme('dark', false), 'dark');
  assert.equal(resolveInitialTheme('light', true), 'light');
});

test('resolveInitialTheme falls back to system preference when no valid preference is stored', () => {
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(null, false), 'light');
  assert.equal(resolveInitialTheme('invalid', true), 'dark');
});

test('splitTextToWords splits prose cleanly without empty tokens', () => {
  assert.deepEqual(splitTextToWords('  Workflows and   AI systems.  '), [
    'Workflows',
    'and',
    'AI',
    'systems.',
  ]);
  assert.deepEqual(splitTextToWords(''), []);
});
