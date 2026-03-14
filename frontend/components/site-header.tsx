"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth-provider";

export function SiteHeader({
  initialSearch = "",
  resetKey = "",
  brandHref = "/companies",
}: {
  initialSearch?: string;
  resetKey?: string;
  brandHref?: string;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  void initialSearch;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setSearchValue("");
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchValue("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchValue("");
  }, [resetKey]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = searchValue.trim();
    router.push(normalized ? `/companies?search=${encodeURIComponent(normalized)}` : "/companies");
    setMenuOpen(false);
    setSearchValue("");
  }

  return (
    <div className="directory-brand-strip directory-brand-strip-menu">
      <div aria-hidden="true" className="directory-header-balance" />
      <Link className="directory-brand-link" href={brandHref}>
        Found
      </Link>
      <div className="directory-header-actions">
        <div className="directory-menu" ref={menuRef}>
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="directory-menu-trigger"
            onClick={() =>
              setMenuOpen((open) => {
                const nextOpen = !open;
                if (nextOpen) {
                  setSearchValue("");
                }
                return nextOpen;
              })
            }
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          {menuOpen ? (
            <div className="directory-menu-popover" role="menu">
              <Link
                className="directory-menu-link"
                href="/"
                onClick={() => {
                  setMenuOpen(false);
                  setSearchValue("");
                }}
                role="menuitem"
              >
                Home
              </Link>
              <Link
                className="directory-menu-link"
                href="/about"
                onClick={() => {
                  setMenuOpen(false);
                  setSearchValue("");
                }}
                role="menuitem"
              >
                About
              </Link>
              <Link
                className="directory-menu-link"
                href="/contact"
                onClick={() => {
                  setMenuOpen(false);
                  setSearchValue("");
                }}
                role="menuitem"
              >
                Contact
              </Link>
              <Link
                className="directory-menu-link"
                href={
                  isAuthenticated
                    ? user?.account_type === "business"
                      ? user.is_business_verified
                        ? "/business/dashboard"
                        : "/business/pending"
                      : "/account"
                    : "/login"
                }
                onClick={() => {
                  setMenuOpen(false);
                  setSearchValue("");
                }}
                role="menuitem"
              >
                Dashboard
              </Link>
              <Link
                className="directory-menu-link"
                href="/companies"
                onClick={() => {
                  setMenuOpen(false);
                  setSearchValue("");
                }}
                role="menuitem"
              >
                Search
              </Link>
              <form className="directory-menu-search" onSubmit={submitSearch} role="search">
                <input
                  autoComplete="off"
                  aria-label="Search businesses"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="find local gems"
                  value={searchValue}
                />
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
