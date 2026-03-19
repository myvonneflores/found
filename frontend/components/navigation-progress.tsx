"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ProgressState = "idle" | "loading" | "complete";

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ProgressState>("idle");
  const previousUrl = useRef(pathname + searchParams.toString());

  useEffect(() => {
    const currentUrl = pathname + searchParams.toString();

    if (currentUrl === previousUrl.current) {
      return;
    }

    previousUrl.current = currentUrl;

    // Navigation completed — show the finish animation
    setState("complete");

    const timer = setTimeout(() => {
      setState("idle");
    }, 350);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // Listen for clicks on links to start the progress bar
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) return;
      if (anchor.target === "_blank") return;
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;

      const currentUrl = pathname + searchParams.toString();
      if (href === currentUrl || href === pathname) return;

      setState("loading");
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, searchParams]);

  if (state === "idle") return null;

  return <div className="nav-progress" data-state={state} />;
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
