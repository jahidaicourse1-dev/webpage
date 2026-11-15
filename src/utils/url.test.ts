import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeBasePath,
  resolveApiUrl,
  resolveAppHref,
  resolveAppRoutePath,
  resolveAssetUrl,
} from './url';

test('normalizeBasePath normalizes root, relative, and repo subpaths', () => {
  assert.equal(normalizeBasePath('/'), '/');
  assert.equal(normalizeBasePath('./'), './');
  assert.equal(normalizeBasePath('portfolio'), '/portfolio/');
  assert.equal(normalizeBasePath('/portfolio/'), '/portfolio/');
});

test('resolveAssetUrl prefixes repository subpath for local assets while preserving external URLs', () => {
  assert.equal(
    resolveAssetUrl('/assets/jahid-hasan-portrait.png', '/portfolio/', ''),
    '/portfolio/assets/jahid-hasan-portrait.png',
  );
  assert.equal(
    resolveAssetUrl('/assets/jahid-hasan-portrait.png', './', ''),
    './assets/jahid-hasan-portrait.png',
  );
  assert.equal(
    resolveAssetUrl('/uploads/photo.png', '/portfolio/', 'https://api.example.com'),
    'https://api.example.com/uploads/photo.png',
  );
  assert.equal(
    resolveAssetUrl('https://cdn.example.com/img.png', '/portfolio/', ''),
    'https://cdn.example.com/img.png',
  );
});

test('resolveApiUrl and route helpers handle GitHub Pages subpaths', () => {
  assert.equal(resolveApiUrl('/api/public/portfolio', ''), '/api/public/portfolio');
  assert.equal(
    resolveApiUrl('/api/public/portfolio', 'https://api.example.com/'),
    'https://api.example.com/api/public/portfolio',
  );
  assert.equal(resolveAppRoutePath('/portfolio/admin', '/portfolio/'), '/admin');
  assert.equal(resolveAppRoutePath('/portfolio/admin', './'), '/admin');
  assert.equal(resolveAppRoutePath('/admin', '/'), '/admin');
  assert.equal(resolveAppHref('/admin', '/portfolio/'), '/portfolio/admin');
});
