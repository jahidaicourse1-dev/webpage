import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../utils/animations';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine) and (hover: hover)').matches;
    const wideEnough = window.innerWidth >= 768;
    if (!finePointer || !wideEnough || prefersReducedMotion()) {
      setEnabled(false);
      return;
    }
    setEnabled(true);

    let active = false;
    let hoveringInteractive = false;
    let targetX = -100;
    let targetY = -100;
    let ringX = -100;
    let ringY = -100;
    let ringScale = 1;
    let dotScale = 1;
    let rafId = 0;

    const isInteractive = (el: EventTarget | null): boolean => {
      if (!(el instanceof Element)) return false;
      return Boolean(
        el.closest('a, button, [role="button"], input, textarea, select, [data-cursor="interactive"]'),
      );
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      targetX = e.clientX;
      targetY = e.clientY;
      if (!active) {
        active = true;
        ringX = targetX;
        ringY = targetY;
      }
      hoveringInteractive = isInteractive(e.target);
    };

    const onPointerLeave = () => {
      active = false;
    };

    const loop = () => {
      const dot = dotRef.current;
      const ring = ringRef.current;
      if (dot && ring) {
        if (!active) {
          dot.style.opacity = '0';
          ring.style.opacity = '0';
        } else {
          ringX += (targetX - ringX) * 0.18;
          ringY += (targetY - ringY) * 0.18;
          const targetRingScale = hoveringInteractive ? 1.55 : 0.72;
          const targetDotScale = hoveringInteractive ? 0 : 1;
          ringScale += (targetRingScale - ringScale) * 0.22;
          dotScale += (targetDotScale - dotScale) * 0.25;

          dot.style.opacity = String(hoveringInteractive ? 0 : 1);
          dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) scale(${dotScale})`;

          ring.style.opacity = hoveringInteractive ? '1' : '0.45';
          ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${ringScale})`;
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave);
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onPointerLeave);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] hidden md:block">
      <div
        ref={dotRef}
        className="fixed left-0 top-0 h-2 w-2 rounded-full bg-[var(--accent)] opacity-0 will-change-transform"
      />
      <div
        ref={ringRef}
        className="fixed left-0 top-0 h-7 w-7 rounded-full border-[1.5px] border-[var(--accent)] opacity-0 will-change-transform"
      />
    </div>
  );
}
