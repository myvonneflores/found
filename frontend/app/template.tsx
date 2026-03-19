"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInitialRender = useRef(true);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isInitialRender.current) {
      // Skip animation on first mount (hard refresh / SSR hydration)
      isInitialRender.current = false;
      return;
    }
    // Client-side navigation — trigger the animation
    setAnimate(true);
    const id = setTimeout(() => setAnimate(false), 300);
    return () => clearTimeout(id);
  }, [pathname]);

  return (
    <div className={animate ? "page-transition-wrapper" : undefined}>
      {children}
    </div>
  );
}
