import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type {
  ContactMessageItem,
  ProjectItem,
  PublicPortfolioPayload,
  SiteContent,
} from '../src/types/portfolio.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'portfolio.db');

let dbInstance: Database.Database | null = null;

const INITIAL_CONTENT: SiteContent = {
  name: 'Jahid Hasan',
  title: 'AI Automation & Digital Solutions',
  heroHeadline: 'AI Automation & Digital Solutions',
  heroSubheadline:
    'Hands-on n8n workflow automation, AI agent development, Gemini API integration, web development, and Google Sheets automation — shaped by three years of corporate planning at RFL.',
  about:
    'AI Automation and Digital Solutions enthusiast with hands-on project experience in n8n workflow automation, AI agent development, Gemini API integration, web development and Google Sheets automation. Three years of experience in a corporate planning environment at RFL. Interested in building practical digital solutions that improve everyday workflows and business productivity.',
  email: 'jahidaicourse1@gmail.com',
  phone: '01707676202',
  location: 'Gaibandha, Bangladesh',
  skills: [
    'AI Automation & n8n',
    'AI Agent Development',
    'Gemini API Integration',
    'Google Sheets Automation',
    'Web Development',
    'Prompt Engineering',
    'Canva Design',
    'SEO & Content Writing',
    'AI Image & Video Creation',
  ],
  services: [],
  experience: [
    {
      id: 'exp-rfl',
      role: 'Planning Floor Officer',
      department: 'Planning Department',
      company: 'RFL',
      duration: '3 years',
      highlights: [
        'Coordinated daily floor production schedules, operational targets and resource tracking in a fast-paced manufacturing environment.',
        'Collaborated across production and management teams to maintain accurate reporting records and support timely workflow execution.',
      ],
    },
  ],
  education: [
    {
      id: 'edu-hsc',
      title: 'Higher Secondary Certificate (HSC)',
      category: 'Academic Qualification',
      statusOrDuration: 'Completed',
    },
    {
      id: 'edu-office',
      title: 'Basic Computer & Microsoft Office Works',
      category: 'Technical Training',
      statusOrDuration: '6-month training',
    },
  ],
  languages: [
    { id: 'lang-bn', name: 'Bengali', proficiency: 'Native' },
    { id: 'lang-en', name: 'English', proficiency: 'Working Proficiency' },
  ],
  profilePhotoUrl: '/assets/jahid-hasan-portrait.png',
  cvFileUrl: '/assets/aistudio/CV_-_Jahid_Hasan__1__54bfb6ac.pdf',
  seoTitle: 'Jahid Hasan — AI Automation & Digital Solutions',
  seoDescription:
    'Portfolio of Jahid Hasan, an AI Automation & Digital Solutions Specialist from Gaibandha, Bangladesh. n8n workflows, AI agents, Gemini API, and web development.',
};

const INITIAL_PROJECTS = [
  {
    title: 'EduGenius AI',
    description:
      'An AI-supported educational platform for streamlining study workflows and structured content generation.',
    tags: ['Gemini API', 'Web Development', 'Study Workflows'],
    imageUrl: '',
    liveLink: '',
    sortOrder: 0,
    published: 1,
  },
  {
    title: 'Telegram AI Agent',
    description:
      'A conversational AI agent on Telegram that handles user inquiries and prompt-driven tasks.',
    tags: ['AI Agent', 'Telegram', 'Prompt Engineering'],
    imageUrl: '',
    liveLink: '',
    sortOrder: 1,
    published: 1,
  },
  {
    title: 'Google Sheets Email Automation',
    description:
      'A workflow connecting Google Sheets records with trigger-based email notifications.',
    tags: ['Google Sheets', 'n8n', 'Workflow Automation'],
    imageUrl: '',
    liveLink: '',
    sortOrder: 2,
    published: 1,
  },
];

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS site_content (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      image_url TEXT NOT NULL DEFAULT '',
      live_link TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      ip_hash TEXT NOT NULL DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_credentials (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const contentRow = db.prepare('SELECT id, data_json FROM site_content WHERE id = 1').get() as
    | { id: number; data_json: string }
    | undefined;
  if (!contentRow) {
    db.prepare('INSERT INTO site_content (id, data_json) VALUES (1, ?)').run(
      JSON.stringify(INITIAL_CONTENT),
    );
  } else {
    try {
      const existing = JSON.parse(contentRow.data_json) as Partial<SiteContent>;
      if (!existing.profilePhotoUrl) {
        existing.profilePhotoUrl = INITIAL_CONTENT.profilePhotoUrl;
        db.prepare('UPDATE site_content SET data_json = ? WHERE id = 1').run(JSON.stringify(existing));
      }
    } catch {
      // keep existing if unparseable
    }
  }

  const projectCount = db.prepare('SELECT COUNT(*) as cnt FROM projects').get() as { cnt: number };
  if (projectCount.cnt === 0) {
    const insert = db.prepare(`
      INSERT INTO projects (title, description, tags_json, image_url, live_link, sort_order, published)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = db.transaction(() => {
      for (const p of INITIAL_PROJECTS) {
        insert.run(
          p.title,
          p.description,
          JSON.stringify(p.tags),
          p.imageUrl,
          p.liveLink,
          p.sortOrder,
          p.published,
        );
      }
    });
    tx();
  }

  dbInstance = db;
  return db;
}

export function getSiteContent(): SiteContent {
  const db = getDb();
  const row = db.prepare('SELECT data_json FROM site_content WHERE id = 1').get() as
    | { data_json: string }
    | undefined;
  if (!row) return INITIAL_CONTENT;
  try {
    return { ...INITIAL_CONTENT, ...JSON.parse(row.data_json) };
  } catch {
    return INITIAL_CONTENT;
  }
}

export function updateSiteContent(content: SiteContent): SiteContent {
  const db = getDb();
  db.prepare(`
    UPDATE site_content
    SET data_json = ?, updated_at = datetime('now')
    WHERE id = 1
  `).run(JSON.stringify(content));
  return getSiteContent();
}

interface ProjectRow {
  id: number;
  title: string;
  description: string;
  tags_json: string;
  image_url: string;
  live_link: string;
  sort_order: number;
  published: number;
  created_at: string;
  updated_at: string;
}

function mapProjectRow(row: ProjectRow): ProjectItem {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags_json);
    if (Array.isArray(parsed)) tags = parsed.map(String);
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags,
    imageUrl: row.image_url,
    liveLink: row.live_link,
    sortOrder: row.sort_order,
    published: Boolean(row.published),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getPublicPortfolio(): PublicPortfolioPayload {
  const db = getDb();
  const content = getSiteContent();
  const rows = db
    .prepare(
      `SELECT id, title, description, tags_json, image_url, live_link, sort_order, published, created_at, updated_at
       FROM projects
       WHERE published = 1
       ORDER BY sort_order ASC, id ASC`,
    )
    .all() as ProjectRow[];

  return {
    content,
    projects: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      tags: mapProjectRow(r).tags,
      imageUrl: r.image_url,
      liveLink: r.live_link,
      sortOrder: r.sort_order,
      published: true,
    })),
  };
}

export function getAllProjectsAdmin(): ProjectItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, title, description, tags_json, image_url, live_link, sort_order, published, created_at, updated_at
       FROM projects
       ORDER BY sort_order ASC, id ASC`,
    )
    .all() as ProjectRow[];
  return rows.map(mapProjectRow);
}

export function createProject(input: {
  title: string;
  description: string;
  tags: string[];
  imageUrl: string;
  liveLink: string;
  published: boolean;
}): ProjectItem {
  const db = getDb();
  const maxRow = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM projects').get() as {
    max_order: number;
  };
  const nextOrder = maxRow.max_order + 1;
  const info = db
    .prepare(
      `INSERT INTO projects (title, description, tags_json, image_url, live_link, sort_order, published)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.title,
      input.description,
      JSON.stringify(input.tags),
      input.imageUrl,
      input.liveLink,
      nextOrder,
      input.published ? 1 : 0,
    );
  const row = db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as ProjectRow;
  return mapProjectRow(row);
}

export function updateProject(
  id: number,
  input: {
    title: string;
    description: string;
    tags: string[];
    imageUrl: string;
    liveLink: string;
    published: boolean;
  },
): ProjectItem | null {
  const db = getDb();
  const result = db
    .prepare(
      `UPDATE projects
       SET title = ?, description = ?, tags_json = ?, image_url = ?, live_link = ?, published = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      input.title,
      input.description,
      JSON.stringify(input.tags),
      input.imageUrl,
      input.liveLink,
      input.published ? 1 : 0,
      id,
    );
  if (result.changes === 0) return null;
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow;
  return mapProjectRow(row);
}

export function deleteProject(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return result.changes > 0;
}

export function reorderProjects(orderedIds: number[]): ProjectItem[] {
  const db = getDb();
  const update = db.prepare('UPDATE projects SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?');
  const tx = db.transaction((ids: number[]) => {
    ids.forEach((id, idx) => {
      update.run(idx, id);
    });
  });
  tx(orderedIds);
  return getAllProjectsAdmin();
}

export function createContactMessage(input: {
  fullName: string;
  email: string;
  subject: string;
  message: string;
  ipHash: string;
}): number {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO contact_messages (full_name, email, subject, message, ip_hash)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(input.fullName, input.email, input.subject, input.message, input.ipHash);
  return Number(info.lastInsertRowid);
}

export function listContactMessages(search = ''): ContactMessageItem[] {
  const db = getDb();
  const q = search.trim();
  const rows = (
    q
      ? db
          .prepare(
            `SELECT id, full_name, email, subject, message, is_read, created_at
             FROM contact_messages
             WHERE full_name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?
             ORDER BY created_at DESC, id DESC`,
          )
          .all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
      : db
          .prepare(
            `SELECT id, full_name, email, subject, message, is_read, created_at
             FROM contact_messages
             ORDER BY created_at DESC, id DESC`,
          )
          .all()
  ) as Array<{
    id: number;
    full_name: string;
    email: string;
    subject: string;
    message: string;
    is_read: number;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    subject: r.subject,
    message: r.message,
    isRead: Boolean(r.is_read),
    createdAt: r.created_at,
  }));
}

export function setContactMessageRead(id: number, isRead: boolean): boolean {
  const db = getDb();
  const res = db
    .prepare('UPDATE contact_messages SET is_read = ? WHERE id = ?')
    .run(isRead ? 1 : 0, id);
  return res.changes > 0;
}

export function deleteContactMessage(id: number): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM contact_messages WHERE id = ?').run(id);
  return res.changes > 0;
}

export function getAdminCredentials(): { username: string; passwordHash: string } | null {
  const db = getDb();
  const row = db
    .prepare('SELECT username, password_hash FROM admin_credentials WHERE id = 1')
    .get() as { username: string; password_hash: string } | undefined;

  if (row && row.username && row.password_hash) {
    return { username: row.username, passwordHash: row.password_hash };
  }

  const envUser = process.env.ADMIN_USERNAME?.trim() || '';
  const envHash = process.env.ADMIN_PASSWORD_HASH?.trim() || '';
  if (envUser && envHash) {
    return { username: envUser, passwordHash: envHash };
  }

  return null;
}

export function saveAdminPasswordHash(username: string, newPasswordHash: string): void {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM admin_credentials WHERE id = 1').get();
  if (existing) {
    db.prepare(
      `UPDATE admin_credentials
       SET username = ?, password_hash = ?, updated_at = datetime('now')
       WHERE id = 1`,
    ).run(username, newPasswordHash);
  } else {
    db.prepare(
      `INSERT INTO admin_credentials (id, username, password_hash)
       VALUES (1, ?, ?)`,
    ).run(username, newPasswordHash);
  }
}
