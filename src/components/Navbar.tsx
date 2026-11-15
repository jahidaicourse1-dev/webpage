import { Menu, Moon, Sun, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ThemeMode } from '../utils/theme';

interface NavbarProps {
  brandName: string;
  showSkills: boolean;
  showProjects: boolean;
  showExperience: boolean;
  showServices: boolean;
  scrollProgress?: number;
  activeSection?: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNavigate?: (hash: string) => void;
}

export default function Navbar({
  brandName,
  showSkills,
  showProjects,
  showExperience,
  showServices,
  scrollProgress = 0,
  activeSection = '',
  theme,
  onToggleTheme,
  onNavigate,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [underline, setUnderline] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });

  const navItems = [
    { label: 'About', href: '#about', visible: true },
    { label: 'Skills', href: '#skills', visible: showSkills },
    { label: 'Projects', href: '#projects', visible: showProjects },
    { label: 'Experience', href: '#experience', visible: showExperience },
    { label: 'Services', href: '#services', visible: showServices },
  ].filter((item) => item.visible);

  useLayoutEffect(() => {
    const navEl = navRef.current;
    const activeLink = activeSection ? linkRefs.current[activeSection] : null;
    if (!navEl || !activeLink) {
      setUnderline((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }
    const navRect = navEl.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    setUnderline({
      left: linkRect.left - navRect.left,
      width: linkRect.width,
      visible: true,
    });
  }, [activeSection, showSkills, showProjects, showExperience, showServices]);

  useEffect(() => {
    const handleResize = () => {
      const navEl = navRef.current;
      const activeLink = activeSection ? linkRefs.current[activeSection] : null;
      if (!navEl || !activeLink) return;
      const navRect = navEl.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      setUnderline({
        left: linkRect.left - navRect.left,
        width: linkRect.width,
        visible: true,
      });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [activeSection]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate && href.startsWith('#')) {
      e.preventDefault();
      setMobileOpen(false);
      onNavigate(href);
    } else {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Top viewport accent scroll progress bar */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 z-50 h-[2.5px] bg-transparent pointer-events-none"
      >
        <div
          className="h-full w-full bg-[var(--accent)] origin-left will-change-transform"
          style={{ transform: `scaleX(${Math.max(0, Math.min(1, scrollProgress))})` }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)] transition-colors duration-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 md:gap-8 px-5 md:px-6">
          {/* Zone 1: Single-element Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => handleLinkClick(e, '#top')}
            className="font-display text-lg font-semibold tracking-tight text-[var(--text)] whitespace-nowrap shrink-0"
          >
            {brandName}
          </a>

          {/* Zone 2: Concise single-line navigation links with sliding accent underline */}
          <nav
            ref={navRef}
            aria-label="Primary navigation"
            className="relative hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.href;
              return (
                <a
                  key={item.href}
                  ref={(el) => {
                    linkRefs.current[item.href] = el;
                  }}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className={`py-1 whitespace-nowrap shrink-0 transition-colors duration-200 hover:text-[var(--text)] ${
                    isActive ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-[100px] origin-left bg-[var(--accent)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                opacity: underline.visible ? 1 : 0,
                transform: `translate3d(${underline.left}px, 0, 0) scaleX(${underline.width / 100})`,
              }}
            />
          </nav>

          {/* Zone 3: Theme switch + single primary CTA */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="inline-flex h-10 items-center gap-2 border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs font-medium text-[var(--text)] transition-colors duration-200 hover:border-[var(--accent)] whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-[var(--accent)]" strokeWidth={1.75} aria-hidden="true" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-[var(--accent)]" strokeWidth={1.75} aria-hidden="true" />
                  <span>Dark</span>
                </>
              )}
            </button>

            <a
              href="#contact"
              onClick={(e) => handleLinkClick(e, '#contact')}
              className="btn-wipe inline-flex h-10 items-center justify-center px-5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Get in touch
            </a>
          </div>

          {/* Mobile controls */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="inline-flex h-10 items-center gap-1.5 border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text)] whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-[var(--accent)]" strokeWidth={1.75} aria-hidden="true" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-[var(--accent)]" strokeWidth={1.75} aria-hidden="true" />
                  <span>Dark</span>
                </>
              )}
            </button>

            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Slide-in mobile navigation drawer with staggered links */}
        <div
          aria-hidden={!mobileOpen}
          className={`md:hidden fixed inset-x-0 top-16 z-30 border-b border-[var(--border)] bg-[var(--bg)] px-5 py-6 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            mobileOpen
              ? 'translate-y-0 opacity-100 pointer-events-auto'
              : '-translate-y-4 opacity-0 pointer-events-none'
          }`}
        >
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {navItems.map((item, idx) => (
              <a
                key={item.href}
                href={item.href}
                tabIndex={mobileOpen ? 0 : -1}
                onClick={(e) => handleLinkClick(e, item.href)}
                style={{
                  transitionDelay: mobileOpen ? `${idx * 45}ms` : '0ms',
                }}
                className={`py-3 text-base font-medium border-b border-[var(--border)] transition-[transform,opacity,color] duration-300 ${
                  activeSection === item.href ? 'text-[var(--accent)]' : 'text-[var(--text)]'
                } ${mobileOpen ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'}`}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#contact"
              tabIndex={mobileOpen ? 0 : -1}
              onClick={(e) => handleLinkClick(e, '#contact')}
              style={{
                transitionDelay: mobileOpen ? `${navItems.length * 45}ms` : '0ms',
              }}
              className={`btn-wipe mt-4 inline-flex items-center justify-center px-5 py-3.5 text-sm font-semibold transition-[transform,opacity] duration-300 ${
                mobileOpen ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
            >
              Get in touch
            </a>
          </nav>
        </div>
      </header>
    </>
  );
}
