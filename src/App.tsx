import { lazy, Suspense, useEffect, useState } from 'react';
import PublicPortfolio from './components/PublicPortfolio';

const AdminPage = lazy(() => import('./pages/AdminPage'));

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
            <p className="font-mono-tabular text-xs uppercase tracking-wider text-[var(--muted)]">
              Loading...
            </p>
          </div>
        }
      >
        <AdminPage />
      </Suspense>
    );
  }

  return <PublicPortfolio />;
}
