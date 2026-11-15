import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import {
  createProject,
  deleteContactMessage,
  deleteProject,
  getAdminCredentials,
  getAllProjectsAdmin,
  getSiteContent,
  listContactMessages,
  reorderProjects,
  saveAdminPasswordHash,
  setContactMessageRead,
  updateProject,
  updateSiteContent,
} from '../db.ts';
import {
  createSessionToken,
  RateLimiter,
  verifyFileMagicBytes,
  verifySessionToken,
  verifyTimingSafeEqual,
} from '../security.ts';
import type { SiteContent } from '../../src/types/portfolio.ts';
import {
  escapeCsvCell,
  sanitizePlainText,
  sanitizeUrl,
  validatePasswordStrength,
  validateProjectInput,
} from '../../src/utils/validation.ts';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const SESSION_COOKIE_NAME = 'jh_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function createAdminRouter(sessionSecret: string) {
  const router = Router();
  const loginLimiter = new RateLimiter(5, 15 * 60 * 1000, 15 * 60 * 1000);

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  function isHttpsRequest(req: Request): boolean {
    return req.secure || req.headers['x-forwarded-proto'] === 'https';
  }

  // Ensure all /api/admin/* responses carry noindex and no-store
  router.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  function verifyCsrf(req: Request, res: Response, next: NextFunction) {
    const cookieToken = typeof req.cookies?.jh_csrf === 'string' ? req.cookies.jh_csrf : '';
    const headerToken = typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : '';
    if (!cookieToken || !headerToken || !verifyTimingSafeEqual(cookieToken, headerToken)) {
      res.status(403).json({ ok: false, error: 'Security verification failed. Refresh and try again.' });
      return;
    }
    next();
  }

  function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
    const token = typeof req.cookies?.[SESSION_COOKIE_NAME] === 'string' ? req.cookies[SESSION_COOKIE_NAME] : '';
    const session = verifySessionToken(token, sessionSecret);
    if (!session) {
      res.status(401).json({ ok: false, error: 'Authentication required.' });
      return;
    }
    (req as Request & { adminUser?: string }).adminUser = session.sub;
    next();
  }

  router.get('/me', (req: Request, res: Response) => {
    const token = typeof req.cookies?.[SESSION_COOKIE_NAME] === 'string' ? req.cookies[SESSION_COOKIE_NAME] : '';
    const session = verifySessionToken(token, sessionSecret);
    if (!session) {
      res.json({ authenticated: false });
      return;
    }
    res.json({ authenticated: true, username: session.sub });
  });

  router.post('/login', verifyCsrf, async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const limitStatus = loginLimiter.check(ip);
    if (!limitStatus.allowed) {
      res.setHeader('Retry-After', String(limitStatus.retryAfterSeconds));
      res.status(429).json({
        ok: false,
        error: 'Too many login attempts. Please try again later.',
      });
      return;
    }

    const creds = getAdminCredentials();
    if (!creds) {
      res.status(503).json({
        ok: false,
        error: 'Administrator credentials are not configured on the server.',
      });
      return;
    }

    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const userMatch = verifyTimingSafeEqual(username, creds.username);
    let passMatch = false;
    try {
      passMatch = password.length > 0 && (await bcrypt.compare(password, creds.passwordHash));
    } catch {
      passMatch = false;
    }

    if (!userMatch || !passMatch) {
      loginLimiter.consume(ip);
      res.status(401).json({ ok: false, error: 'Invalid credentials.' });
      return;
    }

    loginLimiter.reset(ip);
    const token = createSessionToken(creds.username, sessionSecret, SESSION_TTL_MS);
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttpsRequest(req),
      path: '/',
      maxAge: SESSION_TTL_MS,
    });

    res.json({ ok: true, username: creds.username });
  });

  router.post('/logout', verifyCsrf, (req: Request, res: Response) => {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttpsRequest(req),
      path: '/',
    });
    res.json({ ok: true });
  });

  router.post('/change-password', requireAdminAuth, verifyCsrf, async (req: Request, res: Response) => {
    const creds = getAdminCredentials();
    if (!creds) {
      res.status(503).json({ ok: false, error: 'Server credentials unavailable.' });
      return;
    }

    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    const validCurrent = currentPassword.length > 0 && (await bcrypt.compare(currentPassword, creds.passwordHash));
    if (!validCurrent) {
      res.status(400).json({ ok: false, error: 'Current password is incorrect.' });
      return;
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      res.status(400).json({ ok: false, error: strengthError });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    saveAdminPasswordHash(creds.username, newHash);

    const newToken = createSessionToken(creds.username, sessionSecret, SESSION_TTL_MS);
    res.cookie(SESSION_COOKIE_NAME, newToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttpsRequest(req),
      path: '/',
      maxAge: SESSION_TTL_MS,
    });

    res.json({ ok: true, message: 'Password updated successfully.' });
  });

  // Content management
  router.get('/content', requireAdminAuth, (_req: Request, res: Response) => {
    res.json({ content: getSiteContent() });
  });

  router.put('/content', requireAdminAuth, verifyCsrf, (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Partial<SiteContent>;
    const current = getSiteContent();

    const updated: SiteContent = {
      name: sanitizePlainText(body.name ?? current.name) || current.name,
      title: sanitizePlainText(body.title ?? current.title) || current.title,
      heroHeadline: sanitizePlainText(body.heroHeadline ?? current.heroHeadline) || current.heroHeadline,
      heroSubheadline: sanitizePlainText(body.heroSubheadline ?? current.heroSubheadline, true),
      about: sanitizePlainText(body.about ?? current.about, true),
      email: sanitizePlainText(body.email ?? current.email),
      phone: sanitizePlainText(body.phone ?? current.phone),
      location: sanitizePlainText(body.location ?? current.location),
      skills: Array.isArray(body.skills)
        ? body.skills.map((s) => sanitizePlainText(s)).filter(Boolean).slice(0, 30)
        : current.skills,
      services: Array.isArray(body.services)
        ? body.services
            .map((s, idx) => ({
              id: sanitizePlainText(s?.id) || `srv-${idx + 1}`,
              title: sanitizePlainText(s?.title),
              description: sanitizePlainText(s?.description, true),
            }))
            .filter((s) => s.title.length > 0)
            .slice(0, 20)
        : current.services,
      experience: Array.isArray(body.experience)
        ? body.experience
            .map((e, idx) => ({
              id: sanitizePlainText(e?.id) || `exp-${idx + 1}`,
              role: sanitizePlainText(e?.role),
              department: sanitizePlainText(e?.department),
              company: sanitizePlainText(e?.company),
              duration: sanitizePlainText(e?.duration),
              highlights: Array.isArray(e?.highlights)
                ? e.highlights.map((h) => sanitizePlainText(h, true)).filter(Boolean)
                : [],
            }))
            .filter((e) => e.role.length > 0)
            .slice(0, 20)
        : current.experience,
      education: Array.isArray(body.education)
        ? body.education
            .map((ed, idx) => ({
              id: sanitizePlainText(ed?.id) || `edu-${idx + 1}`,
              title: sanitizePlainText(ed?.title),
              category: sanitizePlainText(ed?.category),
              statusOrDuration: sanitizePlainText(ed?.statusOrDuration),
            }))
            .filter((ed) => ed.title.length > 0)
            .slice(0, 20)
        : current.education,
      languages: Array.isArray(body.languages)
        ? body.languages
            .map((l, idx) => ({
              id: sanitizePlainText(l?.id) || `lang-${idx + 1}`,
              name: sanitizePlainText(l?.name),
              proficiency: sanitizePlainText(l?.proficiency),
            }))
            .filter((l) => l.name.length > 0)
            .slice(0, 15)
        : current.languages,
      profilePhotoUrl:
        body.profilePhotoUrl === '' ? '' : sanitizeUrl(body.profilePhotoUrl ?? current.profilePhotoUrl),
      cvFileUrl: body.cvFileUrl === '' ? '' : sanitizeUrl(body.cvFileUrl ?? current.cvFileUrl),
      seoTitle: sanitizePlainText(body.seoTitle ?? current.seoTitle) || current.seoTitle,
      seoDescription: sanitizePlainText(body.seoDescription ?? current.seoDescription, true),
    };

    const saved = updateSiteContent(updated);
    res.json({ ok: true, content: saved });
  });

  // Projects CRUD
  router.get('/projects', requireAdminAuth, (_req: Request, res: Response) => {
    res.json({ projects: getAllProjectsAdmin() });
  });

  router.post('/projects', requireAdminAuth, verifyCsrf, (req: Request, res: Response) => {
    const parsed = validateProjectInput(req.body);
    if (!parsed.ok || !parsed.data) {
      res.status(400).json({ ok: false, error: 'Invalid project details.', errors: parsed.errors });
      return;
    }
    const created = createProject(parsed.data);
    res.status(201).json({ ok: true, project: created });
  });

  router.put('/projects/:id', requireAdminAuth, verifyCsrf, (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ ok: false, error: 'Invalid project ID.' });
      return;
    }
    const parsed = validateProjectInput(req.body);
    if (!parsed.ok || !parsed.data) {
      res.status(400).json({ ok: false, error: 'Invalid project details.', errors: parsed.errors });
      return;
    }
    const updated = updateProject(id, parsed.data);
    if (!updated) {
      res.status(404).json({ ok: false, error: 'Project not found.' });
      return;
    }
    res.json({ ok: true, project: updated });
  });

  router.delete('/projects/:id', requireAdminAuth, verifyCsrf, (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ ok: false, error: 'Invalid project ID.' });
      return;
    }
    const removed = deleteProject(id);
    if (!removed) {
      res.status(404).json({ ok: false, error: 'Project not found.' });
      return;
    }
    res.json({ ok: true });
  });

  router.post('/projects/reorder', requireAdminAuth, verifyCsrf, (req: Request, res: Response) => {
    const ids = Array.isArray(req.body?.orderedIds)
      ? req.body.orderedIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
      : [];
    if (ids.length === 0) {
      res.status(400).json({ ok: false, error: 'Valid project ID list required.' });
      return;
    }
    const projects = reorderProjects(ids);
    res.json({ ok: true, projects });
  });

  // Contact Messages Inbox
  router.get('/messages', requireAdminAuth, (req: Request, res: Response) => {
    const search = typeof req.query.q === 'string' ? req.query.q : '';
    const messages = listContactMessages(search);
    res.json({ messages });
  });

  router.patch('/messages/:id', requireAdminAuth, verifyCsrf, (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ ok: false, error: 'Invalid message ID.' });
      return;
    }
    const isRead = Boolean(req.body?.isRead);
    const updated = setContactMessageRead(id, isRead);
    if (!updated) {
      res.status(404).json({ ok: false, error: 'Message not found.' });
      return;
    }
    res.json({ ok: true });
  });

  router.delete('/messages/:id', requireAdminAuth, verifyCsrf, (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ ok: false, error: 'Invalid message ID.' });
      return;
    }
    const deleted = deleteContactMessage(id);
    if (!deleted) {
      res.status(404).json({ ok: false, error: 'Message not found.' });
      return;
    }
    res.json({ ok: true });
  });

  router.get('/messages/export', requireAdminAuth, (_req: Request, res: Response) => {
    const messages = listContactMessages('');
    const header = ['ID', 'Date', 'Status', 'Full Name', 'Email', 'Subject', 'Message']
      .map(escapeCsvCell)
      .join(',');
    const rows = messages.map((m) =>
      [
        String(m.id),
        m.createdAt,
        m.isRead ? 'Read' : 'Unread',
        m.fullName,
        m.email,
        m.subject,
        m.message,
      ]
        .map(escapeCsvCell)
        .join(','),
    );
    const csv = [header, ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contact-messages.csv"');
    res.send(csv);
  });

  // Secure file uploads (images + CV PDF)
  router.post('/upload/image', requireAdminAuth, verifyCsrf, upload.single('file'), (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ ok: false, error: 'No image file provided.' });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      res.status(400).json({ ok: false, error: 'Image must be 3 MB or smaller.' });
      return;
    }
    const verified = verifyFileMagicBytes(file.buffer, 'image');
    if (!verified.ok) {
      res.status(400).json({ ok: false, error: 'Only valid JPG, PNG, or WebP images are permitted.' });
      return;
    }

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const filename = `img-${crypto.randomUUID()}${verified.ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
    res.status(201).json({ ok: true, url: `/uploads/${filename}` });
  });

  router.post('/upload/cv', requireAdminAuth, verifyCsrf, upload.single('file'), (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ ok: false, error: 'No PDF file provided.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      res.status(400).json({ ok: false, error: 'CV PDF must be 5 MB or smaller.' });
      return;
    }
    const verified = verifyFileMagicBytes(file.buffer, 'pdf');
    if (!verified.ok) {
      res.status(400).json({ ok: false, error: 'Only valid PDF documents are permitted.' });
      return;
    }

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const filename = `cv-${crypto.randomUUID()}.pdf`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
    res.status(201).json({ ok: true, url: `/uploads/${filename}` });
  });

  return router;
}
