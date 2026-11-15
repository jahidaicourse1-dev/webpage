import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const INTRO_SEEN_KEY = 'jh_portfolio_intro_seen';

export function splitTextToWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function shouldPlaySessionIntro(): boolean {
  if (typeof window === 'undefined' || prefersReducedMotion()) return false;
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) !== '1';
  } catch {
    return false;
  }
}

export function markSessionIntroSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

export interface SmoothScrollController {
  lenis: Lenis | null;
  scrollToHash: (hash: string) => void;
  destroy: () => void;
}

export function initSmoothScroll(): SmoothScrollController {
  if (typeof window === 'undefined' || prefersReducedMotion()) {
    return {
      lenis: null,
      scrollToHash: (hash: string) => {
        const target = document.querySelector(hash);
        if (target) target.scrollIntoView({ behavior: 'auto' });
      },
      destroy: () => {},
    };
  }

  const lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.5,
  });

  const onLenisScroll = () => ScrollTrigger.update();
  lenis.on('scroll', onLenisScroll);

  const onTicker = (time: number) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(onTicker);
  gsap.ticker.lagSmoothing(0);

  return {
    lenis,
    scrollToHash: (hash: string) => {
      if (hash === '#top') {
        lenis.scrollTo(0, { duration: 0.9 });
        return;
      }
      const target = document.querySelector<HTMLElement>(hash);
      if (target) {
        lenis.scrollTo(target, { offset: -64, duration: 0.95 });
      }
    },
    destroy: () => {
      gsap.ticker.remove(onTicker);
      lenis.off('scroll', onLenisScroll);
      lenis.destroy();
    },
  };
}

export interface PortfolioMotionOptions {
  root: HTMLElement;
  introActive: boolean;
  onScrollProgress: (progress: number, stage: number) => void;
}

export function initPortfolioMotion({
  root,
  introActive,
  onScrollProgress,
}: PortfolioMotionOptions): () => void {
  if (prefersReducedMotion()) {
    return () => {};
  }

  const ctx = gsap.context(() => {
    const heroDelay = introActive ? 0.85 : 0.05;

    // 1. Hero masked headline words slide up
    const heroWords = gsap.utils.toArray<HTMLElement>('.hero-word', root);
    if (heroWords.length > 0) {
      gsap.from(heroWords, {
        yPercent: 110,
        duration: 0.72,
        stagger: 0.055,
        delay: heroDelay,
        ease: 'power3.out',
        clearProps: 'transform',
      });
    }

    // 2. Hero supporting blocks fade & rise
    const heroFadeItems = gsap.utils.toArray<HTMLElement>('.hero-fade', root);
    if (heroFadeItems.length > 0) {
      gsap.from(heroFadeItems, {
        y: 22,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        delay: heroDelay + 0.12,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });
    }

    // 3. Global scroll progress bar + 3D workflow pipeline synchronization
    ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        const nextStage = Math.min(4, Math.floor(self.progress * 5));
        onScrollProgress(self.progress, nextStage);
      },
    });

    // 4. Sections fade and rise 24px into place
    const sections = gsap.utils.toArray<HTMLElement>('.reveal-section', root);
    sections.forEach((section) => {
      gsap.from(section, {
        y: 24,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: section,
          start: 'top 92%',
          once: true,
        },
      });
    });

    // 5. Headings reveal word by word behind masks
    const headingBlocks = gsap.utils.toArray<HTMLElement>('.reveal-heading', root);
    headingBlocks.forEach((heading) => {
      const words = heading.querySelectorAll<HTMLElement>('.reveal-word');
      if (words.length === 0) return;
      gsap.from(words, {
        yPercent: 112,
        duration: 0.65,
        stagger: 0.04,
        ease: 'power3.out',
        clearProps: 'transform',
        scrollTrigger: {
          trigger: heading,
          start: 'top 92%',
          once: true,
        },
      });
    });

    // 6. Skills staggered list + left-to-right accent underline draw
    const skillRows = gsap.utils.toArray<HTMLElement>('.skill-row', root);
    if (skillRows.length > 0) {
      gsap.from(skillRows, {
        y: 20,
        opacity: 0,
        duration: 0.55,
        stagger: 0.05,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '#skills',
          start: 'top 90%',
          once: true,
        },
      });

      const skillLines = gsap.utils.toArray<HTMLElement>('.skill-underline', root);
      if (skillLines.length > 0) {
        gsap.from(skillLines, {
          scaleX: 0,
          duration: 0.65,
          stagger: 0.055,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: {
            trigger: '#skills',
            start: 'top 90%',
            once: true,
          },
        });
      }
    }

    // 7. Real-data numeric counters (only animate genuine integer figures)
    const counters = gsap.utils.toArray<HTMLElement>('.real-counter', root);
    counters.forEach((counter) => {
      const target = Number(counter.dataset.target || '0');
      if (!Number.isFinite(target) || target <= 0) return;
      const pad = Number(counter.dataset.pad || '0');
      const state = { val: 0 };
      gsap.to(state, {
        val: target,
        duration: 0.75,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: counter,
          start: 'top 94%',
          once: true,
        },
        onUpdate: () => {
          const rounded = Math.round(state.val);
          counter.textContent = pad > 0 ? String(rounded).padStart(pad, '0') : String(rounded);
        },
      });
    });

    // 8. Experience & Education vertical timeline line draw on scroll + entry fades
    const timelineRail = root.querySelector<HTMLElement>('.timeline-progress-line');
    const timelineContainer = root.querySelector<HTMLElement>('.timeline-container');
    if (timelineRail && timelineContainer) {
      gsap.fromTo(
        timelineRail,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: timelineContainer,
            start: 'top 80%',
            end: 'bottom 65%',
            scrub: true,
          },
        },
      );
    }

    const timelineEntries = gsap.utils.toArray<HTMLElement>('.timeline-entry', root);
    timelineEntries.forEach((entry) => {
      gsap.from(entry, {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: entry,
          start: 'top 92%',
          once: true,
        },
      });
    });

    // 9. Staggered project cards
    const projectCards = gsap.utils.toArray<HTMLElement>('.project-card', root);
    if (projectCards.length > 0) {
      gsap.from(projectCards, {
        y: 24,
        opacity: 0,
        duration: 0.65,
        stagger: 0.1,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '#projects',
          start: 'top 92%',
          once: true,
        },
      });
    }

    // 10. Footer oversized name reveal
    const footerNameChars = gsap.utils.toArray<HTMLElement>('.footer-reveal-word', root);
    if (footerNameChars.length > 0) {
      gsap.from(footerNameChars, {
        yPercent: 108,
        duration: 0.8,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'transform',
        scrollTrigger: {
          trigger: '.footer-wordmark',
          start: 'top 96%',
          once: true,
        },
      });
    }
  }, root);

  return () => ctx.revert();
}
