import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BodyClass } from "@/components/body-class";
import { detailDescription } from "@/lib/company-copy";
import { getCompany } from "@/lib/api";
import { instagramProfileUrl } from "@/lib/social-links";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(",");
  }
  return value;
}

function buildBackToDirectoryHref(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    const normalized = normalizeParam(value);
    if (normalized && key !== "selected") {
      params.set(key, normalized);
    }
  });

  const query = params.toString();
  return query ? `/companies?${query}` : "/companies";
}

function displayLabel(value: string) {
  const labels: Record<string, string> = {
    "Carries Locally Made Goods": "Locally Made Goods",
    "Focused on Sustainable Products and/or Services": "Sustainable Products",
    "Independent Designers and/or Makers": "Independent Designers and Makers",
  };

  return labels[value] ?? value;
}

function WebsiteIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeWidth="2.8" />
      <path d="M5.5 16h21" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M16 5.5c3 3.2 4.5 6.7 4.5 10.5S19 23.3 16 26.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M16 5.5c-3 3.2-4.5 6.7-4.5 10.5S13 23.3 16 26.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <rect x="6" y="6" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2.8" />
      <circle cx="16" cy="16" r="4.6" stroke="currentColor" strokeWidth="2.8" />
      <circle cx="22.1" cy="9.9" r="1.4" fill="currentColor" />
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
      <rect x="6" y="6" width="20" height="20" rx="4.5" stroke="currentColor" strokeWidth="2.8" />
      <path d="M11.2 13.4V21" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="11.2" cy="10.5" r="1.5" fill="currentColor" />
      <path d="M16 21v-4.5c0-1.8 1.1-3.1 2.8-3.1 1.6 0 2.5 1.1 2.5 2.9V21" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 13.4V21" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function LinkLogo({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      aria-label={label}
      className="detail-link-logo"
      href={href}
      rel="noreferrer"
      target="_blank"
      title={label}
    >
      <span className="detail-link-logo-mark">{children}</span>
      <span className="detail-link-logo-text">{label}</span>
    </a>
  );
}

function absoluteSiteUrl(path: string) {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const company = await getCompany(slug);
    const description =
      company.description || `Discover ${company.name} on the Found company directory.`;

    return {
      title: company.name,
      description,
      alternates: {
        canonical: `/companies/${company.slug}`,
      },
      openGraph: {
        title: company.name,
        description,
        url: absoluteSiteUrl(`/companies/${company.slug}`),
        type: "article",
      },
    };
  } catch {
    return {
      title: "Company not found",
    };
  }
}

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  try {
    const company = await getCompany(slug);
    const isFoodCompany = company.business_category?.name === "Food";
    const location = [company.city, company.state, company.country].filter(Boolean).join(", ");
    const mapQuery = [company.address, company.city, company.state, company.zip_code, company.country]
      .filter(Boolean)
      .join(", ");
    const mapEmbedUrl = mapQuery
      ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
      : null;
    const description = detailDescription(company);
    const hasAnyLinks = Boolean(
      company.website || company.facebook_page || company.linkedin_page || company.instagram_handle
    );
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: company.name,
      description,
      url: company.website || absoluteSiteUrl(`/companies/${company.slug}`),
      address: {
        "@type": "PostalAddress",
        streetAddress: company.address,
        addressLocality: company.city,
        addressRegion: company.state,
        postalCode: company.zip_code,
        addressCountry: company.country,
      },
    };

    return (
      <main className="page-shell detail-stack detail-page-shell">
        <BodyClass className="detail-page-body" />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          type="application/ld+json"
        />
        <SiteHeader
          initialSearch={normalizeParam(resolvedSearchParams.search) ?? ""}
          resetKey={JSON.stringify(resolvedSearchParams)}
        />

        <section className="detail-card detail-header">
          <h1>
            {company.website ? (
              <a href={company.website} rel="noreferrer" target="_blank">
                {company.name}
              </a>
            ) : (
              company.name
            )}
          </h1>
          <div className="detail-meta">
            {location ? <div className="muted">{location}</div> : null}
            <div className="muted">Founded: {company.founded_year ?? "Unknown"}</div>
          </div>
          <div className="filter-chip-row detail-chip-row">
            {company.business_category ? <span className="badge badge-outline">{company.business_category.name}</span> : null}
            {company.ownership_markers.map((marker) => (
              <span className="badge" key={marker.id}>
                {marker.name}
              </span>
            ))}
            {company.is_vegan_friendly ? <span className="badge">Vegan-friendly</span> : null}
            {company.is_gf_friendly ? <span className="badge">Gluten-free-friendly</span> : null}
            {!company.description ? <span className="badge badge-muted">Curated summary pending</span> : null}
          </div>
          <p className="lede">{description}</p>
        </section>

        <section className="detail-grid">
          <article className="detail-card detail-map-card">
            <span className="field-label">Location</span>
            {mapEmbedUrl ? (
              <div className="detail-map-frame">
                <iframe
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={mapEmbedUrl}
                  title={`Map for ${company.name}`}
                />
              </div>
            ) : (
              <p className="muted">Location not provided.</p>
            )}
            <div className="detail-map-caption">
              <p>{company.address || "Address not provided"}</p>
              <p>{location || "Location not provided"}</p>
            </div>
          </article>

          <article className="detail-card detail-socials-card">
            <span className="field-label">Socials</span>
            <div className="detail-links">
              {company.website ? (
                <LinkLogo href={company.website} label="Website">
                  <WebsiteIcon />
                </LinkLogo>
              ) : null}
              {company.facebook_page ? (
                <LinkLogo href={company.facebook_page} label="Facebook">
                  <FacebookIcon />
                </LinkLogo>
              ) : null}
              {company.linkedin_page ? (
                <LinkLogo href={company.linkedin_page} label="LinkedIn">
                  <LinkedInIcon />
                </LinkLogo>
              ) : null}
              {company.instagram_handle ? (
                <LinkLogo href={instagramProfileUrl(company.instagram_handle)} label="Instagram">
                  <InstagramIcon />
                </LinkLogo>
              ) : null}
            </div>
            {!hasAnyLinks ? <p className="muted">A public website or social profile has not been added yet.</p> : null}
          </article>
        </section>

        <section className="detail-grid">
          <article className="detail-card">
            <span className="field-label">
              {isFoodCompany ? "What they're serving" : "What's in store"}
            </span>
            <div className="filter-chip-row">
              {(isFoodCompany ? company.cuisine_types : company.product_categories).length ? (
                (isFoodCompany ? company.cuisine_types : company.product_categories).map((item) => (
                  <span className="badge" key={item.id}>
                    {item.name}
                  </span>
                ))
              ) : (
                <span className="muted">
                  {isFoodCompany ? "No cuisine types yet." : "No product categories yet."}
                </span>
              )}
            </div>
          </article>
          <article className="detail-card">
            <span className="field-label">Why We Love Them</span>
            <div className="filter-chip-row">
              {company.sustainability_markers.length ? (
                company.sustainability_markers.map((item) => (
                  <span className="badge" key={item.id}>
                    {displayLabel(item.name)}
                  </span>
                ))
              ) : (
                <span className="muted">No sustainability markers yet.</span>
              )}
            </div>
          </article>
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
