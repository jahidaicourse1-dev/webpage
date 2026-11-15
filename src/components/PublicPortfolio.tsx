import gsap from 'gsap';
import { ArrowLeft, ArrowRight, ArrowUpRight, Download } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSEO } from '../hooks/useSEO';
import { useTheme } from '../hooks/useTheme';
import type { ProjectItem, PublicPortfolioPayload } from '../types/portfolio';
import {
  initPortfolioMotion,
  initSmoothScroll,
  markSessionIntroSeen,
  prefersReducedMotion,
  shouldPlaySessionIntro,
  splitTextToWords,
  type SmoothScrollController,
} from '../utils/animations';
import ContactSection from './ContactSection';
import CustomCursor from './CustomCursor';
import Navbar from './Navbar';
import WorkflowFallback from './WorkflowFallback';

const WorkflowCanvas3D = lazy(() => import('./WorkflowCanvas3D'));

function RevealHeading({
  text,
  as: Tag = 'h2',
  className = '',
  wordClassName = 'reveal-word',
  baseClass = 'reveal-heading',
}: {
  text: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  wordClassName?: string;
  baseClass?: string;
}) {
  return (
    <Tag aria-label={text} className={`${baseClass} ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {splitTextToWords(text).map((word, idx) => (
          <span key={idx} className="inline-block overflow-hidden align-bottom mr-[0.26em] last:mr-0">
            <span className={`${wordClassName} inline-block will-change-transform`}>{word}</span>
          </span>
        ))}
      </span>
    </Tag>
  );
}

function ProjectBlueprintThumbnail({ index, title }: { index: number; title: string }) {
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[16/10] w-full bg-[var(--bg)] planning-grid-bg p-6 flex flex-col justify-between overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
    >
      <div className="flex items-center justify-between text-xs font-mono-tabular text-[var(--muted)]">
        <span>Node {String(index + 1).padStart(2, '0')}</span>
        <span>Workflow</span>
      </div>

      <div className="relative flex items-center gap-3 my-auto">
        <span className="h-3 w-3 border border-[var(--border)] bg-[var(--surface)]" />
        <div className="h-[1px] flex-1 bg-[var(--border)] relative overflow-hidden">
          <span className="absolute inset-0 bg-[var(--accent)] scale-x-50 origin-left transition-transform duration-500 group-hover:scale-x-100" />
        </div>
        <span className="h-3.5 w-3.5 bg-[var(--accent)] transition-transform duration-300 group-hover:rotate-45" />
        <div className="h-[1px] flex-1 bg-[var(--border)] relative overflow-hidden">
          <span className="absolute inset-0 bg-[var(--accent)] scale-x-0 origin-left transition-transform duration-500 delay-75 group-hover:scale-x-100" />
        </div>
        <span className="h-3 w-3 border border-[var(--text)] bg-[var(--text)]" />
      </div>

      <div className="font-display text-sm font-medium text-[var(--text)] truncate">{title}</div>
    </div>
  );
}

export default function PublicPortfolio() {
  const { theme, toggleTheme } = useTheme();
  const [portfolio, setPortfolio] = useState<PublicPortfolioPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [showIntro, setShowIntro] = useState(() => shouldPlaySessionIntro());

  const pageRef = useRef<HTMLDivElement | null>(null);
  const introRef = useRef<HTMLDivElement | null>(null);
  const detailViewRef = useRef<HTMLDivElement | null>(null);
  const smoothScrollRef = useRef<SmoothScrollController | null>(null);
  const scrollProgressRef = useRef(0);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollStage, setScrollStage] = useState(0);
  const [activeSection, setActiveSection] = useState('');
  const [shouldUse3D, setShouldUse3D] = useState(false);

  // Detect responsive desktop + motion/hardware capability for 3D scene vs fallback
  useEffect(() => {
    const updateMedia = () => {
      const reduced = prefersReducedMotion();
      const smallViewport = window.innerWidth < 768;
      const lowCores = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2;
      setShouldUse3D(!reduced && !smallViewport && !lowCores);
    };
    updateMedia();
    window.addEventListener('resize', updateMedia, { passive: true });
    return () => window.removeEventListener('resize', updateMedia);
  }, []);

  // Load public portfolio content
  useEffect(() => {
    let active = true;
    fetch('/api/public/portfolio')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load portfolio');
        return (await res.json()) as PublicPortfolioPayload;
      })
      .then((data) => {
        if (!active) return;
        setPortfolio(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError('Unable to load portfolio content right now.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Sync dynamic document title & meta tags based on active section or viewed project
  useSEO(portfolio?.content, activeSection, selectedProject);

  // First-visit session intro (< 1.2s total, skipped on repeat visits or reduced-motion)
  useEffect(() => {
    if (!showIntro || loading || !introRef.current) return;
    const el = introRef.current;
    const fallbackTimer = window.setTimeout(() => {
      markSessionIntroSeen();
      setShowIntro(false);
    }, 1500);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          window.clearTimeout(fallbackTimer);
          markSessionIntroSeen();
          setShowIntro(false);
        },
      });
      tl.from('.intro-line', {
        yPercent: 115,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power3.out',
      })
        .to({}, { duration: 0.16 })
        .to(el, {
          yPercent: -100,
          duration: 0.46,
          ease: 'power3.inOut',
        });
    }, el);

    return () => {
      window.clearTimeout(fallbackTimer);
      ctx.revert();
    };
  }, [showIntro, loading]);

  // Smooth scrolling via Lenis + GSAP ScrollTrigger choreography
  useEffect(() => {
    if (!portfolio || !pageRef.current) return;

    const scroller = initSmoothScroll();
    smoothScrollRef.current = scroller;

    const cleanupMotion = initPortfolioMotion({
      root: pageRef.current,
      introActive: showIntro,
      onScrollProgress: (progress, stage) => {
        scrollProgressRef.current = progress;
        setScrollProgress(progress);
        setScrollStage((prev) => (prev !== stage ? stage : prev));
      },
    });

    return () => {
      cleanupMotion();
      scroller.destroy();
      smoothScrollRef.current = null;
    };
  }, [portfolio]);

  // Section scroll spy for active nav sliding underline
  useEffect(() => {
    if (!portfolio) return;
    const sectionIds = ['#about', '#skills', '#projects', '#experience', '#services', '#contact'];
    const els = sectionIds
      .map((id) => document.querySelector<HTMLElement>(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          const id = `#${visible[0].target.id}`;
          setActiveSection(id === '#contact' ? '' : id);
        }
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: [0.1, 0.35, 0.6] },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [portfolio]);

  // Project Detail transition in/out
  useEffect(() => {
    if (!selectedProject || !detailViewRef.current) return;
    const el = detailViewRef.current;

    if (!prefersReducedMotion()) {
      gsap.fromTo(
        el,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'transform' },
      );
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeProjectDetail();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedProject]);

  const closeProjectDetail = useCallback(() => {
    if (!detailViewRef.current || prefersReducedMotion()) {
      setSelectedProject(null);
      return;
    }
    gsap.to(detailViewRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.3,
      ease: 'power3.in',
      onComplete: () => setSelectedProject(null),
    });
  }, []);

  const handleNavigate = useCallback((hash: string) => {
    if (smoothScrollRef.current) {
      smoothScrollRef.current.scrollToHash(hash);
    } else {
      const target = document.querySelector(hash);
      target?.scrollIntoView();
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-6">
        <p className="font-mono-tabular text-xs uppercase tracking-wider text-[var(--muted)]">
          Loading portfolio...
        </p>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-6">
        <div className="border border-[var(--border)] bg-[var(--surface)] p-8 max-w-md text-center">
          <p className="text-sm text-[var(--text)]">{error || 'Portfolio unavailable.'}</p>
        </div>
      </div>
    );
  }

  const { content, projects } = portfolio;
  const hasSkills = content.skills.length > 0;
  const hasProjects = projects.length > 0;
  const hasExperienceOrEdu =
    content.experience.length > 0 || content.education.length > 0 || content.languages.length > 0;
  const hasServices = content.services.length > 0;
  const contactSurface = hasServices ? 'bg' : 'surface';
  const footerBgClass = hasServices ? 'bg-[var(--surface)]' : 'bg-[var(--bg)]';

  return (
    <div id="top" ref={pageRef} className="grain-surface min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Desktop-only custom accent cursor */}
      <CustomCursor />

      {/* First-visit masked session intro (< 1.2s) */}
      {showIntro && (
        <div
          ref={introRef}
          aria-hidden="true"
          className="fixed inset-0 z-[80] bg-[var(--bg)] flex flex-col items-center justify-center px-6 pointer-events-none"
        >
          <div className="overflow-hidden">
            <span className="intro-line block font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--text)]">
              {content.name}
            </span>
          </div>
          <div className="overflow-hidden mt-3">
            <span className="intro-line block font-mono-tabular text-xs sm:text-sm uppercase tracking-widest text-[var(--muted)]">
              {content.title}
            </span>
          </div>
          <div className="mt-5 h-[2px] w-12 bg-[var(--accent)]" />
        </div>
      )}

      <Navbar
        brandName={content.name}
        showSkills={hasSkills}
        showProjects={hasProjects}
        showExperience={hasExperienceOrEdu}
        showServices={hasServices}
        scrollProgress={scrollProgress}
        activeSection={activeSection}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={handleNavigate}
      />

      <main>
        {/* HERO SECTION (--bg) */}
        <section className="relative py-12 md:py-20 planning-grid-bg">
          <div className="mx-auto max-w-6xl px-5 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-7 flex flex-col justify-between py-2">
                <div>
                  <div className="hero-fade flex items-center gap-4">
                    {content.profilePhotoUrl && (
                      <div className="h-14 w-14 shrink-0 border border-[var(--border)] bg-[var(--surface)] p-0.5 overflow-hidden">
                        <img
                          src={content.profilePhotoUrl}
                          alt={content.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-mono-tabular text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                        {content.location}
                      </p>
                      <div className="mt-1 h-[1.5px] w-8 bg-[var(--accent)]" aria-hidden="true" />
                    </div>
                  </div>

                  <RevealHeading
                    as="h1"
                    text={content.name}
                    baseClass=""
                    wordClassName="hero-word"
                    className="mt-6 font-display text-4xl sm:text-5xl lg:text-[4rem] font-semibold leading-[1.04] tracking-tight text-[var(--text)] text-balance"
                  />

                  <RevealHeading
                    as="h2"
                    text={content.title}
                    baseClass=""
                    wordClassName="hero-word"
                    className="mt-3 font-display text-xl sm:text-2xl font-medium text-[var(--text)] text-balance"
                  />

                  <p className="hero-fade mt-6 max-w-xl text-base leading-relaxed text-[var(--muted)]">
                    {content.heroSubheadline}
                  </p>
                </div>

                <div className="hero-fade mt-10 flex flex-wrap items-center gap-4">
                  <a
                    href="#contact"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigate('#contact');
                    }}
                    className="btn-wipe inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold whitespace-nowrap"
                  >
                    <span>Get in touch</span>
                    <ArrowRight className="btn-arrow h-4 w-4" aria-hidden="true" />
                  </a>
                  {content.cvFileUrl && (
                    <a
                      href={content.cvFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-wipe-outline inline-flex items-center gap-2.5 px-5 py-3.5 text-sm font-medium whitespace-nowrap"
                    >
                      <Download className="btn-arrow h-4 w-4" aria-hidden="true" />
                      <span>Download CV</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="hero-fade lg:col-span-5 flex flex-col">
                <div className="flex-1 min-h-[340px] lg:min-h-[420px]">
                  {shouldUse3D ? (
                    <Suspense fallback={<WorkflowFallback className="h-full" />}>
                      <WorkflowCanvas3D
                        scrollProgressRef={scrollProgressRef}
                        theme={theme}
                        className="h-full"
                      />
                    </Suspense>
                  ) : (
                    <WorkflowFallback className="h-full" />
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-mono-tabular text-[var(--muted)]">
                  <span>Workflow Pipeline</span>
                  <span>Stage {String(scrollStage + 1).padStart(2, '0')} / 05</span>
                </div>
              </div>
            </div>

            {/* Animated downward scroll indicator line */}
            <div className="hero-fade mt-12 flex items-center justify-between border-t border-[var(--border)] pt-5">
              <a
                href="#about"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate('#about');
                }}
                className="group inline-flex items-center gap-3 text-xs font-mono-tabular uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)]"
              >
                <span className="relative h-7 w-[1.5px] bg-[var(--border)] overflow-hidden" aria-hidden="true">
                  <span className="animate-scroll-line absolute inset-x-0 top-0 h-1/2 bg-[var(--accent)]" />
                </span>
                <span>Scroll to explore</span>
              </a>
              <span className="hidden sm:inline font-mono-tabular text-xs text-[var(--muted)]">
                {content.email}
              </span>
            </div>
          </div>
        </section>

        {/* ABOUT SECTION (--surface) */}
        {content.about && (
          <section id="about" className="reveal-section border-t border-[var(--border)] bg-[var(--surface)] py-20 md:py-28">
            <div className="mx-auto max-w-6xl px-5 md:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
                <div className="lg:col-span-4">
                  <div className="flex items-center gap-3">
                    <span className="h-[1.5px] w-6 bg-[var(--accent)]" aria-hidden="true" />
                    <span className="font-mono-tabular text-xs font-medium text-[var(--text)]">01</span>
                    <p className="font-mono-tabular text-xs uppercase tracking-wider text-[var(--muted)]">
                      About
                    </p>
                  </div>

                  <RevealHeading
                    text="Practical systems, built step by step."
                    className="mt-4 font-display text-3xl font-semibold tracking-tight text-[var(--text)] text-balance"
                  />

                  {content.profilePhotoUrl ? (
                    <div className="group mt-8 max-w-[280px] border border-[var(--border)] bg-[var(--bg)] p-2">
                      <div className="aspect-square overflow-hidden bg-[var(--surface-subtle)]">
                        <img
                          src={content.profilePhotoUrl}
                          alt={content.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover object-top transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                        />
                      </div>
                      <div className="pt-3 pb-1 px-1 flex items-center justify-between text-xs font-mono-tabular text-[var(--muted)]">
                        <span className="text-[var(--text)]">{content.name}</span>
                        <span>Gaibandha, BD</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      aria-hidden="true"
                      className="mt-8 aspect-[4/3] max-w-[240px] border border-[var(--border)] bg-[var(--bg)] p-5 flex flex-col justify-between planning-grid-bg"
                    >
                      <span className="font-mono-tabular text-xs text-[var(--muted)]">Profile</span>
                      <span className="font-display text-3xl font-semibold tracking-tight text-[var(--text)]">
                        JH
                      </span>
                      <span className="text-xs text-[var(--muted)]">{content.location}</span>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-8">
                  <p className="text-lg md:text-xl leading-relaxed text-[var(--text)] max-w-2xl">
                    {content.about}
                  </p>
                  <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-[var(--border)] pt-8">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[var(--muted)]">Based in</div>
                      <div className="mt-1.5 text-sm font-medium text-[var(--text)]">{content.location}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[var(--muted)]">Email</div>
                      <div className="mt-1.5 text-sm font-medium text-[var(--text)] break-all">
                        <a
                          href={`mailto:${content.email}`}
                          className="underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--accent)] transition-colors duration-200"
                        >
                          {content.email}
                        </a>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[var(--muted)]">Phone</div>
                      <div className="mt-1.5 font-mono-tabular text-sm font-medium text-[var(--text)]">
                        <a
                          href={`tel:${content.phone}`}
                          className="underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--accent)] transition-colors duration-200"
                        >
                          {content.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SKILLS SECTION (--bg) */}
        {hasSkills && (
          <section id="skills" className="reveal-section border-t border-[var(--border)] bg-[var(--bg)] py-20 md:py-28">
            <div className="mx-auto max-w-6xl px-5 md:px-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="h-[1.5px] w-6 bg-[var(--accent)]" aria-hidden="true" />
                    <span className="font-mono-tabular text-xs font-medium text-[var(--text)]">02</span>
                    <p className="font-mono-tabular text-xs uppercase tracking-wider text-[var(--muted)]">
                      Skills &amp; Capabilities
                    </p>
                  </div>
                  <RevealHeading
                    text="Core capabilities across automation and digital execution."
                    className="mt-4 font-display text-3xl font-semibold tracking-tight text-[var(--text)] text-balance"
                  />
                </div>
                <span className="font-mono-tabular text-xs text-[var(--muted)] whitespace-nowrap">
                  <span className="real-counter font-medium text-[var(--text)]" data-target={content.skills.length} data-pad="2">
                    {String(content.skills.length).padStart(2, '0')}
                  </span>{' '}
                  Areas
                </span>
              </div>

              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-2">
                {content.skills.map((skill, idx) => (
                  <li key={`${skill}-${idx}`} className="skill-row group relative py-5">
                    <div className="flex items-baseline gap-4">
                      <span className="font-mono-tabular text-xs text-[var(--muted)] shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-display text-lg font-medium text-[var(--text)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
                        {skill}
                      </span>
                    </div>
                    {/* Thin architectural line + left-to-right drawing accent underline */}
                    <div aria-hidden="true" className="relative mt-4 h-[1px] w-full bg-[var(--border)] overflow-hidden">
                      <span className="skill-underline absolute inset-0 bg-[var(--accent)] opacity-60 group-hover:opacity-100 origin-left transition-opacity duration-200" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* PROJECTS SECTION (--surface) */}
        {hasProjects && (
          <section id="projects" className="reveal-section border-t border-[var(--border)] bg-[var(--surface)] py-20 md:py-28">
            <div className="mx-auto max-w-6xl px-5 md:px-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="h-[1.5px] w-6 bg-[var(--accent)]" aria-hidden="true" />
                    <span className="font-mono-tabular text-xs font-medium text-[var(--text)]">03</span>
                    <p className="font-mono-tabular text-xs uppercase tracking-wider text-[var(--muted)]">
                      Selected Projects
                    </p>
                  </div>
                  <RevealHeading
                    text="Workflows and AI systems in practice."
                    className="mt-4 font-display text-3xl font-semibold tracking-tight text-[var(--text)] text-balance"
                  />
                </div>
                <span className="font-mono-tabular text-xs text-[var(--muted)] whitespace-nowrap">
                  <span className="real-counter font-medium text-[var(--text)]" data-target={projects.length} data-pad="2">
                    {String(projects.length).padStart(2, '0')}
                  </span>{' '}
                  Published
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {projects.map((project, idx) => (
                  <article
                    key={project.id}
                    data-cursor="interactive"
                    onClick={() => setSelectedProject(project)}
                    className="project-card group relative border border-[var(--border)] bg-[var(--bg)] flex flex-col justify-between cursor-pointer transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5"
                  >
                    <div>
                      <div className="border-b border-[var(--border)] overflow-hidden">
                        {project.imageUrl ? (
                          <div className="aspect-[16/10] w-full bg-[var(--surface-subtle)] overflow-hidden">
                            <img
                              src={project.imageUrl}
                              alt={project.title}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                            />
                          </div>
                        ) : (
                          <ProjectBlueprintThumbnail index={idx} title={project.title} />
                        )}
                      </div>

                      <div className="p-6">
                        <h3 className="font-display text-xl font-semibold tracking-tight text-[var(--text)]">
                          {project.title}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                          {project.description}
                        </p>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-4 border-t border-[var(--border)] space-y-3">
                      {project.tags.length > 0 && (
                        <p className="text-xs leading-relaxed text-[var(--muted)]">
                          {project.tags.join(' · ')}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProject(project);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text)] underline decoration-[var(--border)] underline-offset-4 group-hover:decoration-[var(--accent)] whitespace-nowrap"
                        >
                          <span>Details</span>
                          <ArrowRight className="btn-arrow h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        {project.liveLink && (
                          <a
                            href={project.liveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Open live project ${project.title}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text)] hover:underline underline-offset-4 whitespace-nowrap"
                          >
                            <span>Live</span>
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Thin accent bottom edge drawing left-to-right on hover */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[var(--accent)] scale-x-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
                    />
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* EXPERIENCE, EDUCATION & LANGUAGES SECTION (--bg) with scroll-drawn vertical timeline */}
        {hasExperienceOrEdu && (
          <section id="experience" className="reveal-section border-t border-[var(--border)] bg-[var(--bg)] py-20 md:py-28">
            <div className="mx-auto max-w-6xl px-5 md:px-6">
              <div className="flex items-center gap-3">
                <span className="h-[1.5px] w-6 bg-[var(--accent)]" aria-hidden="true" />
                <span className="font-mono-tabular text-xs font-medium text-[var(--text)]">04</span>
                <p className="font-mono-tabular text-xs uppercase tracking-wider text-[var(--muted)]">
                  Experience &amp; Education
                </p>
              </div>
              <RevealHeading
                text="Operational discipline and continuous technical learning."
                className="mt-4 font-display text-3xl font-semibold tracking-tight text-[var(--text)] mb-12 text-balance"
              />

              <div className="timeline-container relative pl-7 md:pl-10">
                {/* Vertical timeline track + animated Signal Orange scroll-draw line */}
                <div
                  aria-hidden="true"
                  className="absolute left-2 md:left-3 top-2 bottom-2 w-[1px] bg-[var(--border)]"
                >
                  <div className="timeline-progress-line h-full w-[1.5px] -ml-[0.25px] bg-[var(--accent)] origin-top will-change-transform" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  {content.experience.length > 0 && (
                    <div className="lg:col-span-7 space-y-6">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-3">
                        Work Experience
                      </h3>
                      {content.experience.map((exp) => (
                        <div
                          key={exp.id}
                          className="timeline-entry relative border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8"
                        >
                          {/* Timeline node square aligned cleanly to left rail */}
                          <span
                            aria-hidden="true"
                            className="absolute -left-[25px] md:-left-[34px] top-8 h-2.5 w-2.5 border border-[var(--accent)] bg-[var(--bg)]"
                          />
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h4 className="font-display text-xl font-semibold text-[var(--text)]">
                              {exp.role}
                            </h4>
                            <span className="font-mono-tabular text-xs font-medium text-[var(--muted)]">
                              {exp.duration}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                            {[exp.department, exp.company].filter(Boolean).join(' · ')}
                          </p>
                          {exp.highlights.length > 0 && (
                            <ul className="mt-5 space-y-3 border-t border-[var(--border)] pt-5">
                              {exp.highlights.map((bullet, bIdx) => (
                                <li
                                  key={bIdx}
                                  className="flex items-start gap-3 text-sm leading-relaxed text-[var(--muted)]"
                                >
                                  <span className="font-mono-tabular text-xs text-[var(--text)] mt-1 shrink-0">
                                    {String(bIdx + 1).padStart(2, '0')}
                                  </span>
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="lg:col-span-5 space-y-10">
                    {content.education.length > 0 && (
                      <div className="timeline-entry relative">
                        <span
                          aria-hidden="true"
                          className="lg:hidden absolute -left-[25px] top-1 h-2.5 w-2.5 border border-[var(--accent)] bg-[var(--bg)]"
                        />
                        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-3">
                          Education &amp; Training
                        </h3>
                        <div className="divide-y divide-[var(--border)] border-b border-[var(--border)]">
                          {content.education.map((edu) => (
                            <div key={edu.id} className="timeline-entry py-5">
                              <div className="flex items-baseline justify-between gap-4">
                                <span className="text-xs text-[var(--muted)]">{edu.category}</span>
                                <span className="font-mono-tabular text-xs text-[var(--muted)]">
                                  {edu.statusOrDuration}
                                </span>
                              </div>
                              <h4 className="mt-1.5 font-display text-base font-semibold text-[var(--text)]">
                                {edu.title}
                              </h4>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {content.languages.length > 0 && (
                      <div className="timeline-entry">
                        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-3">
                          Languages
                        </h3>
                        <div className="divide-y divide-[var(--border)] border-b border-[var(--border)]">
                          {content.languages.map((lang) => (
                            <div key={lang.id} className="py-4 flex items-center justify-between gap-4">
                              <span className="font-display text-base font-medium text-[var(--text)]">
                                {lang.name}
                              </span>
                              <span className="text-sm text-[var(--muted)]">{lang.proficiency}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* OPTIONAL SERVICES SECTION (--surface when present) */}
        {hasServices && (
          <section id="services" className="reveal-section border-t border-[var(--border)] bg-[var(--surface)] py-20 md:py-28">
            <div className="mx-auto max-w-6xl px-5 md:px-6">
              <div className="flex items-center gap-3">
                <span className="h-[1.5px] w-6 bg-[var(--accent)]" aria-hidden="true" />
                <span className="font-mono-tabular text-xs font-medium text-[var(--text)]">05</span>
                <p className="font-mono-tabular text-xs uppercase tracking-wider text-[var(--muted)]">
                  Services
                </p>
              </div>
              <RevealHeading
                text="How I can help your team."
                className="mt-4 font-display text-3xl font-semibold tracking-tight text-[var(--text)] mb-12 text-balance"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {content.services.map((srv, idx) => (
                  <div key={srv.id} className="border border-[var(--border)] bg-[var(--bg)] p-6">
                    <span className="font-mono-tabular text-xs text-[var(--muted)]">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <h3 className="mt-3 font-display text-lg font-semibold text-[var(--text)]">
                      {srv.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                      {srv.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CONTACT SECTION */}
        <ContactSection
          email={content.email}
          phone={content.phone}
          location={content.location}
          sectionNumber={hasServices ? '06' : '05'}
          surfaceVariant={contactSurface}
        />
      </main>

      {/* EDITORIAL FOOTER WITH REVEALING LARGE NAME */}
      <footer className={`border-t border-[var(--border)] ${footerBgClass} pt-12 pb-10`}>
        <div className="mx-auto max-w-6xl px-5 md:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[var(--muted)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-[var(--text)]">{content.name}</span>
              <span aria-hidden="true">·</span>
              <span>{content.title}</span>
              <span aria-hidden="true">·</span>
              <span>{content.location}</span>
            </div>
            <div className="flex items-center gap-6">
              {content.cvFileUrl && (
                <a
                  href={content.cvFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--text)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--accent)]"
                >
                  CV (PDF)
                </a>
              )}
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate('#top');
                }}
                className="text-[var(--text)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--accent)]"
              >
                Back to top
              </a>
            </div>
          </div>

          {/* Large name wordmark that reveals cleanly as footer enters view */}
          <div className="footer-wordmark mt-10 pt-8 border-t border-[var(--border)] overflow-hidden">
            <div
              aria-label={content.name}
              className="font-display font-semibold tracking-tight leading-[0.92] text-[clamp(2.85rem,11.5vw,9rem)] text-[var(--text)] select-none"
            >
              <span className="sr-only">{content.name}</span>
              <span aria-hidden="true" className="block">
                {splitTextToWords(content.name).map((word, idx) => (
                  <span key={idx} className="inline-block overflow-hidden align-bottom mr-[0.22em] last:mr-0">
                    <span className="footer-reveal-word inline-block will-change-transform">{word}</span>
                  </span>
                ))}
              </span>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <a
              href="/admin"
              rel="nofollow"
              className="font-mono-tabular text-[11px] text-[var(--muted)]/70 hover:text-[var(--text)] transition-colors duration-200 underline-offset-4 hover:underline"
            >
              Admin
            </a>
          </div>
        </div>
      </footer>

      {/* Smooth Project Detail Page Transition View */}
      {selectedProject && (
        <div
          ref={detailViewRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-detail-title"
          className="fixed inset-0 z-50 bg-[var(--bg)] text-[var(--text)] overflow-y-auto"
        >
          <div className="border-b border-[var(--border)] bg-[var(--bg)] sticky top-0 z-10">
            <div className="mx-auto max-w-5xl px-5 md:px-6 h-16 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={closeProjectDetail}
                className="group inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--text)] hover:underline underline-offset-4"
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
                <span>Back to projects</span>
              </button>
              <button
                type="button"
                aria-label="Close project details"
                onClick={closeProjectDetail}
                className="border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--accent)]"
              >
                Close
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-5xl px-5 md:px-6 py-12 md:py-20">
            <div className="flex items-center gap-3">
              <span className="h-[1.5px] w-8 bg-[var(--accent)]" aria-hidden="true" />
              <span className="font-mono-tabular text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                Project Detail
              </span>
            </div>

            <h2
              id="project-detail-title"
              className="mt-4 font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--text)] text-balance"
            >
              {selectedProject.title}
            </h2>

            <div className="mt-8 border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              {selectedProject.imageUrl ? (
                <div className="aspect-[16/9] w-full overflow-hidden">
                  <img
                    src={selectedProject.imageUrl}
                    alt={selectedProject.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[16/9] w-full bg-[var(--bg)] planning-grid-bg p-8 md:p-12 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-mono-tabular text-[var(--muted)]">
                    <span>System Blueprint</span>
                    <span>{selectedProject.title}</span>
                  </div>
                  <div className="flex items-center gap-4 my-auto">
                    <span className="h-4 w-4 border border-[var(--border)] bg-[var(--surface)]" />
                    <div className="h-[1.5px] flex-1 bg-[var(--accent)]" />
                    <span className="h-5 w-5 bg-[var(--accent)]" />
                    <div className="h-[1.5px] flex-1 bg-[var(--border)]" />
                    <span className="h-4 w-4 bg-[var(--text)]" />
                  </div>
                  <div className="text-xs font-mono-tabular text-[var(--muted)]">
                    {selectedProject.tags.join(' · ')}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-12 gap-8 border-t border-[var(--border)] pt-8">
              <div className="md:col-span-8">
                <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  Overview
                </h3>
                <p className="mt-3 text-lg leading-relaxed text-[var(--text)]">
                  {selectedProject.description}
                </p>
              </div>
              <div className="md:col-span-4 space-y-6">
                {selectedProject.tags.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Technologies
                    </h3>
                    <p className="mt-2 text-sm font-mono-tabular text-[var(--text)] leading-relaxed">
                      {selectedProject.tags.join(' · ')}
                    </p>
                  </div>
                )}
                {selectedProject.liveLink && (
                  <a
                    href={selectedProject.liveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-wipe inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold"
                  >
                    <span>Open live project</span>
                    <ArrowUpRight className="btn-arrow h-4 w-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
