import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import ContentEditor from '../components/admin/ContentEditor';
import MessagesInbox from '../components/admin/MessagesInbox';
import ProjectsManager from '../components/admin/ProjectsManager';
import SecuritySettings from '../components/admin/SecuritySettings';
import type { ProjectItem, SiteContent } from '../types/portfolio';
import { apiJson } from '../utils/api';
import { resolveAppHref } from '../utils/url';

type AdminTab = 'content' | 'projects' | 'inbox' | 'security';

export default function AdminPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');

  // Login form state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Dashboard data
  const [activeTab, setActiveTab] = useState<AdminTab>('content');
  const [content, setContent] = useState<SiteContent | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  // Inject noindex meta tag on /admin route
  useEffect(() => {
    document.title = 'Admin Console';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  async function loadAdminData() {
    const [contentRes, projRes] = await Promise.all([
      apiJson<{ content?: SiteContent }>('/api/admin/content'),
      apiJson<{ projects?: ProjectItem[] }>('/api/admin/projects'),
    ]);
    if (contentRes.ok && contentRes.data.content) setContent(contentRes.data.content);
    if (projRes.ok && projRes.data.projects) setProjects(projRes.data.projects);
  }

  useEffect(() => {
    apiJson<{ authenticated: boolean; username?: string }>('/api/admin/me')
      .then((res) => {
        if (res.staticBackendMissing) {
          setBackendUnavailable(true);
          return undefined;
        }
        if (res.ok && res.data.authenticated) {
          setAuthenticated(true);
          setUsername(res.data.username || '');
          return loadAdminData();
        }
        return undefined;
      })
      .catch(() => {
        setBackendUnavailable(true);
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);

    try {
      const res = await apiJson<{ ok: boolean; username?: string; error?: string }>('/api/admin/login', {
        method: 'POST',
        requireCsrf: true,
        body: { username: loginUser, password: loginPass },
      });

      if (!res.ok || !res.data.ok) {
        setLoginError(res.data.error || 'Invalid credentials.');
        return;
      }

      setAuthenticated(true);
      setUsername(res.data.username || loginUser);
      setLoginPass('');
      await loadAdminData();
    } catch {
      setLoginError('Unable to reach authentication server.');
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await apiJson('/api/admin/logout', { method: 'POST', requireCsrf: true });
    setAuthenticated(false);
    setUsername('');
    setContent(null);
    setProjects([]);
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <p className="font-mono-tabular text-xs uppercase tracking-wider text-[#57554F]">
          Checking session...
        </p>
      </div>
    );
  }

  if (backendUnavailable) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center px-6">
        <div className="w-full max-w-md border border-[#E4E1DA] bg-white p-8 space-y-4">
          <p className="font-mono-tabular text-xs uppercase tracking-wider text-[#57554F]">
            Static Hosting Mode
          </p>
          <h1 className="font-display text-2xl font-semibold text-[#141413]">
            Backend Required for Admin Console
          </h1>
          <p className="text-sm leading-relaxed text-[#57554F]">
            GitHub Pages serves only static public files and cannot run the Express + SQLite admin server.
            Run the Node server locally or deploy <code className="font-mono-tabular text-[#141413]">server.ts</code>{' '}
            separately and configure <code className="font-mono-tabular text-[#141413]">VITE_API_BASE_URL</code>.
          </p>
          <div className="pt-2">
            <a
              href={resolveAppHref('/')}
              className="inline-block bg-[#141413] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#E8501A]"
            >
              Back to public portfolio
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center px-6">
        <div className="w-full max-w-md border border-[#E4E1DA] bg-white p-8">
          <p className="font-mono-tabular text-xs uppercase tracking-wider text-[#57554F]">
            Private Access
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#141413]">
            Administrator Sign In
          </h1>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
                Username
              </label>
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#1E40AF] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#1E40AF] focus:bg-white focus:outline-none"
              />
            </div>

            {loginError && (
              <div role="alert" className="border border-[#B91C1C]/30 bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-[#141413] px-5 py-3 text-sm font-medium text-white hover:bg-[#1E40AF] disabled:opacity-60"
            >
              {loggingIn ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#141413]">
      <header className="border-b border-[#E4E1DA] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-4">
            <span className="font-display text-lg font-semibold text-[#141413]">Admin Console</span>
            <a
              href={resolveAppHref('/')}
              className="text-xs text-[#57554F] hover:text-[#141413] underline underline-offset-4"
            >
              View public site
            </a>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 border border-[#E4E1DA] px-3.5 py-2 text-xs font-medium text-[#141413] hover:bg-[#F8F7F4]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <nav aria-label="Admin sections" className="flex flex-wrap gap-2 border-b border-[#E4E1DA] pb-4 mb-8">
          {(
            [
              { id: 'content', label: 'Site Content' },
              { id: 'projects', label: 'Projects' },
              { id: 'inbox', label: 'Messages Inbox' },
              { id: 'security', label: 'Security' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#141413] text-white'
                  : 'border border-[#E4E1DA] bg-white text-[#57554F] hover:text-[#141413]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'content' && content && (
          <ContentEditor initialContent={content} onSaved={(updated) => setContent(updated)} />
        )}
        {activeTab === 'projects' && (
          <ProjectsManager initialProjects={projects} onChanged={(next) => setProjects(next)} />
        )}
        {activeTab === 'inbox' && <MessagesInbox />}
        {activeTab === 'security' && <SecuritySettings username={username} />}
      </div>
    </div>
  );
}
