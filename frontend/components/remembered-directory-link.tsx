"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { getStoredDirectoryHref } from "@/lib/directory-session";

export function RememberedDirectoryLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [href, setHref] = useState("/companies");

  useEffect(() => {
    const nextHref = getStoredDirectoryHref();
    setHref(nextHref);
    void router.prefetch(nextHref);
  }, [router]);

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}
