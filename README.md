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

## GitHub Pages Deployment

A GitHub Actions workflow is included at `.github/workflows/deploy-gh-pages.yml` to build and deploy the public portfolio to GitHub Pages cleanly:

1. Push this repository to GitHub (default branch `main`).
2. In your GitHub repository, open **Settings -> Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or trigger **Deploy to GitHub Pages** manually from the **Actions** tab).
   - The workflow automatically detects project subpath repositories (`https://<user>.github.io/<repo>/`) vs user sites (`https://<user>.github.io/`), generates `dist/404.html` and `dist/.nojekyll`, and serves all portrait/CV assets correctly.
   - To build locally for manual upload to Pages:
     ```bash
     npm run build:gh-pages
     ```
4. **Full-stack note**: GitHub Pages only hosts static files, so the public site automatically uses static fallback content and offers a direct `mailto:` link on the contact form. If you host `server.ts` separately (for live CMS editing and inbox storage), set `VITE_API_BASE_URL` as a GitHub Repository Variable and `CORS_ORIGIN` on the backend server.

