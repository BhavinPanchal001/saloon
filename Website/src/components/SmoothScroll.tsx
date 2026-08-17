import { useEffect, useRef } from "react";
import Lenis from "lenis";

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    let rafId: number;

    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    // Stop Lenis when any form input is focused to prevent the
    // browser scroll-into-view vs Lenis smooth-scroll conflict loop.
    const handleFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el && (INPUT_TAGS.has(el.tagName) || el.isContentEditable)) {
        lenis.stop();
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as HTMLElement | null;
      // Only restart if focus isn't moving to another input
      if (!next || (!INPUT_TAGS.has(next.tagName) && !next.isContentEditable)) {
        lenis.start();
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}

