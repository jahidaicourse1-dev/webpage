import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { Router } from 'express';
import { createContactMessage, getPublicPortfolio } from '../db.ts';
import { sendContactNotification } from '../mailer.ts';
import { hashIp, RateLimiter, verifyTimingSafeEqual } from '../security.ts';
import { validateContactInput } from '../../src/utils/validation.ts';

export function createPublicRouter(sessionSecret: string) {
  const router = Router();
  const contactLimiter = new RateLimiter(5, 15 * 60 * 1000, 15 * 60 * 1000);

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

  router.get('/csrf', (req: Request, res: Response) => {
    let token = typeof req.cookies?.jh_csrf === 'string' ? req.cookies.jh_csrf : '';
    if (!token || token.length < 32) {
      token = crypto.randomBytes(24).toString('hex');
      res.cookie('jh_csrf', token, {
        httpOnly: false,
        sameSite: 'lax',
        secure: isHttpsRequest(req),
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
      });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ csrfToken: token });
  });

  router.get('/public/portfolio', (_req: Request, res: Response) => {
    const payload = getPublicPortfolio();
    res.setHeader('Cache-Control', 'no-store');
    res.json(payload);
  });

  router.post('/contact', async (req: Request, res: Response) => {
    const cookieToken = typeof req.cookies?.jh_csrf === 'string' ? req.cookies.jh_csrf : '';
    const headerToken = typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : '';
    if (!cookieToken || !headerToken || !verifyTimingSafeEqual(cookieToken, headerToken)) {
      res.status(403).json({ ok: false, error: 'Invalid security token. Please refresh and try again.' });
      return;
    }

    const ip = getClientIp(req);
    const limit = contactLimiter.check(ip);
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      res.status(429).json({
        ok: false,
        error: 'Too many submissions. Please wait a few minutes before trying again.',
      });
      return;
    }

    const parsed = validateContactInput(req.body);
    if (parsed.data?.honeypotTriggered) {
      // Silently reject automated bot submissions without saving to DB
      res.status(200).json({ ok: true, message: 'Thank you. Your message has been received.' });
      return;
    }

    if (!parsed.ok || !parsed.data) {
      res.status(400).json({
        ok: false,
        error: 'Please check the highlighted fields and try again.',
        errors: parsed.errors,
      });
      return;
    }

    contactLimiter.consume(ip);

    try {
      const id = createContactMessage({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
        ipHash: hashIp(ip, sessionSecret),
      });

      if (!id) {
        res.status(500).json({ ok: false, error: 'Could not save your message. Please try again.' });
        return;
      }

      // Optional server-side notification (errors are swallowed safely so DB save still succeeds)
      sendContactNotification({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
      }).catch(() => {});

      res.status(201).json({
        ok: true,
        message: 'Your message has been saved and delivered.',
      });
    } catch {
      res.status(500).json({ ok: false, error: 'Unable to save your message right now.' });
    }
  });

  return router;
}
