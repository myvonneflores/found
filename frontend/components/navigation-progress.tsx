"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ProgressState = "idle" | "loading" | "complete";

function buildUrl(pathname: string, searchParams: URLSearchParams) {
  const search = searchParams.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ProgressState>("idle");
  const previousUrl = useRef(buildUrl(pathname, searchParams));

  useEffect(() => {
    const currentUrl = buildUrl(pathname, searchParams);

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
      if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;
      if (anchor.target === "_blank") return;
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;

      try {
        const currentUrl = new URL(window.location.href);
        const linkUrl = new URL(href, window.location.origin);

        if (linkUrl.origin !== currentUrl.origin) return;

        const samePathAndSearch =
          linkUrl.pathname === currentUrl.pathname &&
          linkUrl.search === currentUrl.search;

        // Hash-only or identical navigations stay on the same page
        if (samePathAndSearch) return;
      } catch {
        return;
      }

      setState("loading");
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

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
