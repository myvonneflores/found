import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BodyClass } from "@/components/body-class";
import { CompanyOwnerEditor } from "@/components/company-owner-editor";
import { CompanySaveFlow, CompanyShareButton } from "@/components/company-save-flow";
import { CompanySocialLinks, hasCompanySocialLinks } from "@/components/company-social-links";
import { ScrollToTop } from "@/components/scroll-to-top";
import { formatHoursRange, WEEKDAYS, WEEKDAY_LABELS } from "@/lib/business-hours";
import { detailDescription } from "@/lib/company-copy";
import { getCompany } from "@/lib/api";
import { getAbsoluteSiteUrl } from "@/lib/site-url";
import { SiteHeader } from "@/components/site-header";
import type { BusinessHours, Weekday } from "@/types/company";

export const dynamic = "force-dynamic";

const FOOD_BUSINESS_CATEGORIES = new Set(["Food", "Food+Bev"]);

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

function hasListedHours(businessHours: BusinessHours | null) {
  return Boolean(businessHours && WEEKDAYS.some((day) => businessHours.open_by_week[day].length > 0));
}

function renderDayHours(businessHours: BusinessHours, day: Weekday) {
  const intervals = businessHours.open_by_week[day];
  if (intervals.length === 0) {
    return "Closed";
  }

  return intervals.map((interval) => formatHoursRange(interval.start, interval.end)).join(", ");
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
        url: getAbsoluteSiteUrl(`/companies/${company.slug}`),
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
  const autoEdit = normalizeParam(resolvedSearchParams.edit) === "1";

  try {
    const company = await getCompany(slug);
    const isFoodCompany = company.business_category
      ? FOOD_BUSINESS_CATEGORIES.has(company.business_category.name)
      : false;
    const location = [company.city, company.state].filter(Boolean).join(", ");
    const mapQuery = [company.address, company.city, company.state, company.zip_code, company.country]
      .filter(Boolean)
      .join(", ");
    const mapEmbedUrl = mapQuery
      ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
      : null;
    const description = detailDescription(company);
    const hasAnyLinks = hasCompanySocialLinks({
      website: company.website,
      linkedinPage: company.linkedin_page,
      facebookPage: company.facebook_page,
      instagramHandle: company.instagram_handle,
    });
    const businessHours = company.business_hours;
    const claimedProfile = company.claimed_profile;
    const publicRecommendations = company.public_recommendations;
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: company.name,
      description,
      url: company.website || getAbsoluteSiteUrl(`/companies/${company.slug}`),
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
        <ScrollToTop />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          type="application/ld+json"
        />
        <SiteHeader
          initialSearch={normalizeParam(resolvedSearchParams.search) ?? ""}
          resetKey={JSON.stringify(resolvedSearchParams)}
        />

        <CompanyOwnerEditor autoEdit={autoEdit} company={company} />

        <section className="detail-card detail-header">
          <div className="detail-header-top">
            <div className="detail-header-copy">
              <h1>
                {company.website ? (
                  <a className="detail-header-title-text" href={company.website} rel="noreferrer" target="_blank">
                    {company.name}
                  </a>
                ) : (
                  <span className="detail-header-title-text">{company.name}</span>
                )}
                <div className="detail-title-actions">
                  <CompanySaveFlow companyId={company.id} companySlug={company.slug} />
                  <CompanyShareButton
                    shareText={`Check out ${company.name} on FOUND.`}
                    shareTitle={company.name}
                    shareUrl={`/companies/${company.slug}`}
                  />
                </div>
              </h1>
              <div className="detail-meta">
                {location ? <div className="muted">{location}</div> : null}
              </div>
            </div>
            {hasAnyLinks ? (
              <div className="detail-header-rail">
                <CompanySocialLinks
                  className="detail-header-links"
                  facebookPage={company.facebook_page}
                  instagramHandle={company.instagram_handle}
                  linkedinPage={company.linkedin_page}
                  website={company.website}
                />
              </div>
            ) : null}
          </div>
          <div className="filter-chip-row detail-chip-row">
            {company.business_category ? <span className="badge badge-outline">{company.business_category.name}</span> : null}
            {company.is_community_listed ? <span className="badge badge-community">Community Listed</span> : null}
            {company.ownership_markers.map((marker) => (
              <span className="badge" key={marker.id}>
                {marker.name}
              </span>
            ))}
          </div>
          {description ? <p className="lede">{description}</p> : null}
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
              <p className="muted">Coming soon</p>
            )}
            <div className="detail-map-caption">
              <p>{company.address || "Coming soon"}</p>
              <p>{location || "Coming soon"}</p>
            </div>
          </article>
          <article className="detail-card detail-hours-card">
            <span className="field-label">Business Hours</span>
            {businessHours ? (
              <div className="detail-hours-list">
                {WEEKDAYS.map((day) => (
                  <div className="detail-hours-row" key={day}>
                    <span className="detail-hours-day">{WEEKDAY_LABELS[day]}</span>
                    <span className="detail-hours-value">{renderDayHours(businessHours, day)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Coming soon</p>
            )}
            {businessHours && company.business_hours_timezone && hasListedHours(businessHours) ? (
              <p className="detail-hours-timezone">Timezone: {company.business_hours_timezone}</p>
            ) : null}
          </article>
        </section>

        <section className="detail-grid">
          {company.other_locations.length ? (
            <article className="detail-card">
              <span className="field-label">Other locations</span>
              <div className="detail-recommendations-pill-grid">
                {company.other_locations.map((locationItem) => (
                  <Link
                    className="dashboard-row dashboard-row-link dashboard-chip-link dashboard-chip-button detail-recommendation-pill"
                    href={`/companies/${locationItem.slug}`}
                    key={locationItem.slug}
                  >
                    <span className="dashboard-chip-label">
                      <strong>{locationItem.name}</strong>
                      <span>{[locationItem.address, locationItem.city, locationItem.state].filter(Boolean).join(", ")}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </article>
          ) : null}
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
                <span className="muted">Coming soon</span>
              )}
            </div>
          </article>
          <article className="detail-card">
            <span className="field-label">More to Love</span>
            <div className="filter-chip-row">
              {company.sustainability_markers.length ? (
                company.sustainability_markers.map((item) => (
                  <span className="badge" key={item.id}>
                    {displayLabel(item.name)}
                  </span>
                ))
              ) : (
                <span className="muted">Coming soon</span>
              )}
            </div>
          </article>
        </section>

        {claimedProfile || publicRecommendations.length ? (
          <section className="detail-card detail-recommendations-card">
            <div className="detail-claimed-header">
              <div className="detail-claimed-copy">
                <h2>Recommendations</h2>
                {claimedProfile?.public_slug ? (
                  <p className="muted">
                    Shared public lists live on{" "}
                    <Link href={`/profiles/${claimedProfile.public_slug}`}>{claimedProfile.display_name}&apos;s profile</Link>.
                  </p>
                ) : null}
              </div>
            </div>

            {publicRecommendations.length ? (
              <div className="recommendation-list">
                {publicRecommendations.map((recommendation) => (
                  <article className="recommendation-card" key={recommendation.id}>
                    <div className="recommendation-card-top">
                      <div>
                        <strong>{recommendation.title}</strong>
                      </div>
                    </div>
                    <p>{recommendation.body}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {publicRecommendations.length === 0 ? (
              <div className="detail-recommendations-empty">
                <span className="muted">No public recommendations for this location yet.</span>
              </div>
            ) : null}

          </section>
        ) : null}
      </main>
    );
  } catch {
    notFound();
  }
}
