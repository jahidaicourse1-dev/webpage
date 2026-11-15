# Jahid Hasan — Portfolio & Admin CMS

Full-stack editorial portfolio and private administration console for **Jahid Hasan** (AI Automation & Digital Solutions, Gaibandha, Bangladesh).

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Three.js (3D workflow pipeline hero), and GSAP ScrollTrigger.
- **Backend**: Express (`server.ts`) with SQLite (`better-sqlite3` in `data/portfolio.db`) and Vite middleware in development.
- **Security**:
  - Server-side `bcrypt` password hashing (`ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` via environment variables).
  - Signed `httpOnly`, `SameSite=Lax`, `Secure` (on HTTPS) session cookies.
  - CSRF token verification (`X-CSRF-Token` + cookie) on state-changing routes.
  - Per-IP rate limiting and temporary lockout on `/api/admin/login` and `/api/contact`.
  - Honeypot spam protection and input sanitization on the contact form.
  - Magic-byte file signature verification on image (`.jpg`, `.png`, `.webp`) and CV (`.pdf`) uploads.
  - `/admin` is unlinked from the public site, excluded from `robots.txt` and `sitemap.xml`, and carries `noindex, nofollow`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example` (never commit `.env`):
   ```bash
   cp .env.example .env
   ```

3. Generate a bcrypt password hash for your admin password:
   ```bash
   npm run hash-password -- "YourStrongPassword123"
   ```
   Copy the printed `ADMIN_PASSWORD_HASH="..."` into `.env`, and set `ADMIN_USERNAME` and a long random `SESSION_SECRET`.

4. Start development server on port 3000:
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `APP_URL` | Recommended | Public base URL for `sitemap.xml` and `robots.txt` |
| `ADMIN_USERNAME` | Yes (for admin login) | Administrator login username |
| `ADMIN_PASSWORD_HASH` | Yes (for admin login) | Bcrypt hash generated via `npm run hash-password` |
| `SESSION_SECRET` | Recommended | 64-char hex secret for signing session cookies |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_NOTIFY_EMAIL` | Optional | Enables server-side email alerts on contact submissions |

## Build & Production Deployment

```bash
npm run build
npm run start
```
