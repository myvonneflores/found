"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInitialRender = useRef(true);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    function resetScrollPosition() {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }

    if (isInitialRender.current) {
      // Skip animation on first mount (hard refresh / SSR hydration)
      isInitialRender.current = false;
      return;
    }

    resetScrollPosition();
    const firstFrame = window.requestAnimationFrame(resetScrollPosition);
    const secondFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resetScrollPosition);
    });
    const timer = window.setTimeout(() => {
      resetScrollPosition();
      setAnimate(false);
    }, 300);

    // Client-side navigation — trigger the animation
    setAnimate(true);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <div className={animate ? "page-transition-wrapper" : undefined}>
      {children}
    </div>
  );
}
