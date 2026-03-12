import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompany } from "@/lib/api";

export const dynamic = "force-dynamic";

function absoluteSiteUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const company = await getCompany(slug);
    const location = [company.city, company.state, company.country].filter(Boolean).join(", ");
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: company.name,
      description: company.description,
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
      <main className="page-shell detail-stack">
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          type="application/ld+json"
        />
        <Link className="button button-secondary" href="/companies">
          Back to directory
        </Link>

        <section className="detail-card detail-header">
          <div className="filter-chip-row">
            {company.business_category ? <span className="badge">{company.business_category.name}</span> : null}
            {company.is_vegan_friendly ? <span className="badge">Vegan-friendly</span> : null}
            {company.is_gf_friendly ? <span className="badge">Gluten-free-friendly</span> : null}
          </div>
          <h1>{company.name}</h1>
          <p className="lede">{company.description || "Profile details coming soon."}</p>
          {location ? <div className="muted">{location}</div> : null}
        </section>

        <section className="detail-grid">
          <article className="detail-card">
            <span className="field-label">Location</span>
            <p>{company.address || "Address not provided"}</p>
            <p>{location || "Location not provided"}</p>
          </article>

          <article className="detail-card">
            <span className="field-label">Company details</span>
            <p>Founded: {company.founded_year ?? "Unknown"}</p>
            <p>Employees: {company.number_of_employees ?? "Unknown"}</p>
          </article>

          <article className="detail-card">
            <span className="field-label">Links</span>
            <div className="detail-links">
              {company.website ? (
                <a className="button button-secondary" href={company.website} rel="noreferrer" target="_blank">
                  Website
                </a>
              ) : null}
              {company.facebook_page ? (
                <a className="button button-secondary" href={company.facebook_page} rel="noreferrer" target="_blank">
                  Facebook
                </a>
              ) : null}
              {company.linkedin_page ? (
                <a className="button button-secondary" href={company.linkedin_page} rel="noreferrer" target="_blank">
                  LinkedIn
                </a>
              ) : null}
            </div>
          </article>
        </section>

        <section className="detail-grid">
          <article className="detail-card">
            <span className="field-label">Product categories</span>
            <div className="filter-chip-row">
              {company.product_categories.length ? (
                company.product_categories.map((item) => (
                  <span className="badge" key={item.id}>
                    {item.name}
                  </span>
                ))
              ) : (
                <span className="muted">No product categories yet.</span>
              )}
            </div>
          </article>
          <article className="detail-card">
            <span className="field-label">Sustainability markers</span>
            <div className="filter-chip-row">
              {company.sustainability_markers.length ? (
                company.sustainability_markers.map((item) => (
                  <span className="badge" key={item.id}>
                    {item.name}
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
