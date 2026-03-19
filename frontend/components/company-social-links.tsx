import type { ReactNode } from "react";

import { instagramProfileUrl } from "@/lib/social-links";

function WebsiteIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeWidth="2.8" />
      <path d="M5.5 16h21" stroke="currentColor" strokeLinecap="round" strokeWidth="2.8" />
      <path
        d="M16 5.5c3 3.2 4.5 6.7 4.5 10.5S19 23.3 16 26.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.8"
      />
      <path
        d="M16 5.5c-3 3.2-4.5 6.7-4.5 10.5S13 23.3 16 26.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.8"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <rect height="20" rx="6" stroke="currentColor" strokeWidth="2.8" width="20" x="6" y="6" />
      <circle cx="16" cy="16" r="4.6" stroke="currentColor" strokeWidth="2.8" />
      <circle cx="22.1" cy="9.9" fill="currentColor" r="1.4" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path
        d="M18.8 26V17.4h3.1l.7-4.1h-3.8v-2.1c0-1.7.7-2.7 2.8-2.7H23V5c-.9-.1-1.9-.2-3.1-.2-3.4 0-5.6 2.1-5.6 5.9v2.6H11v4.1h3.3V26h4.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <rect height="20" rx="4.5" stroke="currentColor" strokeWidth="2.8" width="20" x="6" y="6" />
      <path d="M11.2 13.4V21" stroke="currentColor" strokeLinecap="round" strokeWidth="2.8" />
      <circle cx="11.2" cy="10.5" fill="currentColor" r="1.5" />
      <path
        d="M16 21v-4.5c0-1.8 1.1-3.1 2.8-3.1 1.6 0 2.5 1.1 2.5 2.9V21"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.8"
      />
      <path d="M16 13.4V21" stroke="currentColor" strokeLinecap="round" strokeWidth="2.8" />
    </svg>
  );
}

function SocialLinkLogo({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      aria-label={label}
      className="directory-link-logo"
      href={href}
      rel="noreferrer"
      target="_blank"
      title={label}
    >
      <span className="directory-link-logo-mark">{children}</span>
    </a>
  );
}

export function hasCompanySocialLinks({
  website,
  linkedinPage,
  facebookPage,
  instagramHandle,
}: {
  website?: string | null;
  linkedinPage?: string | null;
  facebookPage?: string | null;
  instagramHandle?: string | null;
}) {
  return Boolean(website || linkedinPage || facebookPage || instagramHandle);
}

export function CompanySocialLinks({
  website,
  linkedinPage,
  facebookPage,
  instagramHandle,
  className,
}: {
  website?: string | null;
  linkedinPage?: string | null;
  facebookPage?: string | null;
  instagramHandle?: string | null;
  className?: string;
}) {
  if (!hasCompanySocialLinks({ website, linkedinPage, facebookPage, instagramHandle })) {
    return null;
  }

  return (
    <div className={className}>
      {website ? (
        <SocialLinkLogo href={website} label="Website">
          <WebsiteIcon />
        </SocialLinkLogo>
      ) : null}
      {linkedinPage ? (
        <SocialLinkLogo href={linkedinPage} label="LinkedIn">
          <LinkedInIcon />
        </SocialLinkLogo>
      ) : null}
      {facebookPage ? (
        <SocialLinkLogo href={facebookPage} label="Facebook">
          <FacebookIcon />
        </SocialLinkLogo>
      ) : null}
      {instagramHandle ? (
        <SocialLinkLogo href={instagramProfileUrl(instagramHandle)} label="Instagram">
          <InstagramIcon />
        </SocialLinkLogo>
      ) : null}
    </div>
  );
}
