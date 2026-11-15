import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectItem, SiteContent } from '../types/portfolio';
import { resolveDynamicSeo } from './seo';

const SAMPLE_CONTENT: SiteContent = {
  name: 'Jahid Hasan',
  title: 'AI Automation & Digital Solutions',
  heroHeadline: 'AI Automation & Digital Solutions',
  heroSubheadline: 'Subheadline',
  about: 'About text',
  email: 'jahidaicourse1@gmail.com',
  phone: '01707676202',
  location: 'Gaibandha, Bangladesh',
  skills: [],
  services: [],
  experience: [],
  education: [],
  languages: [],
  profilePhotoUrl: '',
  cvFileUrl: '',
  seoTitle: 'Jahid Hasan — AI Automation & Digital Solutions',
  seoDescription: 'Default portfolio SEO description.',
};

const SAMPLE_PROJECT: ProjectItem = {
  id: 1,
  title: 'EduGenius AI',
  description: 'An AI-supported educational platform for streamlining study workflows.',
  tags: ['Gemini API'],
  imageUrl: '',
  liveLink: '',
  sortOrder: 1,
  published: true,
};

test('resolveDynamicSeo returns default database SEO metadata at top of page', () => {
  const result = resolveDynamicSeo(SAMPLE_CONTENT, '', null);
  assert.equal(result.title, 'Jahid Hasan — AI Automation & Digital Solutions');
  assert.equal(result.description, 'Default portfolio SEO description.');
});

test('resolveDynamicSeo prioritizes selectedProject over activeSection', () => {
  const result = resolveDynamicSeo(SAMPLE_CONTENT, '#projects', SAMPLE_PROJECT);
  assert.equal(result.title, 'EduGenius AI — Jahid Hasan');
  assert.equal(result.description, SAMPLE_PROJECT.description);
});

test('resolveDynamicSeo adapts title and description for active section', () => {
  const result = resolveDynamicSeo(SAMPLE_CONTENT, '#skills', null);
  assert.equal(result.title, 'Skills & Capabilities — Jahid Hasan');
  assert.ok(result.description.includes('n8n workflow automation'));
});
