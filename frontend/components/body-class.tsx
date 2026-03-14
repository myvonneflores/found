"use client";

import { useEffect } from "react";

export function BodyClass({ className }: { className: string }) {
  useEffect(() => {
    const classNames = className.split(/\s+/).filter(Boolean);
    document.body.classList.add(...classNames);

    return () => {
      document.body.classList.remove(...classNames);
    };
  }, [className]);

  return null;
}
