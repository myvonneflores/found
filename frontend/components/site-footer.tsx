"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";

const socialLinks = {
  instagram: "https://www.instagram.com/found.in_/",
  linkedin: "https://www.linkedin.com/company/f-o-u-n-d/",
};

function InstagramIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="4.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10.2V16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M12 16v-3.2c0-1.3.9-2.3 2.1-2.3 1.2 0 1.9.8 1.9 2.4V16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <circle cx="8" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M13.1 20v-6.2h2.3l.4-2.8h-2.7V9.1c0-.8.3-1.5 1.6-1.5h1.3V5.1c-.2 0-.9-.1-1.8-.1-2.5 0-4 1.3-4 3.8V11H8v2.8h2.2V20h2.9Z"
        fill="currentColor"
      />
      <rect x="4" y="4" width="16" height="16" rx="3.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function SiteFooter() {
  const router = useRouter();
  const { hasKnownAccount, isAuthenticated, signOut } = useAuth();

  function handleSignOut() {
    signOut();
    router.push("/");
  }

  return (
    <footer className="site-footer">
      <div className="site-footer-shell">
        <div className="site-footer-topline">
          <div className="site-footer-mark">FOUND</div>
          <nav aria-label="Footer" className="site-footer-nav">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/companies">Search</Link>
            <Link href="/lists">Lists</Link>
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
            <Link href="/faqs">FAQs</Link>
          </nav>
          <div className="site-footer-socials">
            <a
              aria-label="Instagram"
              className="site-footer-social"
              href="https://www.instagram.com/found.in_/"
              rel="noreferrer"
              target="_blank"
            >
              <InstagramIcon />
            </a>
            <a
              aria-label="LinkedIn"
              className="site-footer-social"
              href="https://www.linkedin.com/company/f-o-u-n-d/"
              rel="noreferrer"
              target="_blank"
            >
              <LinkedInIcon />
            </a>
            <span aria-label="Facebook coming soon" className="site-footer-social is-disabled" title="Facebook coming soon">
              <FacebookIcon />
            </span>
          </div>
        </div>
        <div className="site-footer-brand">
          <p className="site-footer-copy">A conscious discovery engine for local, independent, value-aligned businesses.</p>
        </div>
        <div className="site-footer-account">
          {isAuthenticated ? (
            <button className="site-footer-logout" onClick={handleSignOut} type="button">
              Logout
            </button>
          ) : (
            <Link className="site-footer-logout" href={hasKnownAccount ? "/login" : "/signup"}>
              {hasKnownAccount ? "Log in" : "Sign Up"}
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
