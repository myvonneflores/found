"use client";

import { useLayoutEffect } from "react";

export function ScrollToTop() {
  useLayoutEffect(() => {
    const resetScrollPosition = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScrollPosition();

    const firstFrame = window.requestAnimationFrame(resetScrollPosition);
    const secondFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resetScrollPosition);
    });
    const immediateTimer = window.setTimeout(resetScrollPosition, 0);
    const delayedTimer = window.setTimeout(resetScrollPosition, 120);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(immediateTimer);
      window.clearTimeout(delayedTimer);
    };
  }, []);

  return null;
}
