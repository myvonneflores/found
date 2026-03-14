import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";
import { getPublicProfile } from "@/lib/api";

export const dynamic = "force-dynamic";

function profileLabel(accountType: "personal" | "business") {
  return accountType === "business" ? "Business curator" : "Community curator";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}): Promise<Metadata> {
  try {
    const { publicSlug } = await params;
    const profile = await getPublicProfile(publicSlug);

    return {
      title: profile.display_name,
      description: profile.bio || `Explore public lists curated by ${profile.display_name} on FOUND.`,
      alternates: {
        canonical: `/profiles/${profile.public_slug}`,
      },
    };
  } catch {
    return {
      title: "Profile not found",
    };
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}) {
  try {
    const { publicSlug } = await params;
    const profile = await getPublicProfile(publicSlug);
    const fallbackInitial = profile.display_name.trim().charAt(0).toUpperCase() || "F";

    return (
      <main className="page-shell directory-page-shell public-list-page-shell">
        <BodyClass className="public-list-page-body" />
        <div className="directory-shell">
          <SiteHeader resetKey={`/profiles/${publicSlug}`} />

          <section className="public-list-stage">
            <article className="public-list-hero-card">
              <div className="public-profile-hero-top">
                {profile.avatar_url ? (
                  <img
                    alt={`${profile.display_name} avatar`}
                    className="public-profile-avatar"
                    height="112"
                    src={profile.avatar_url}
                    width="112"
                  />
                ) : (
                  <div aria-hidden="true" className="public-profile-avatar public-profile-avatar-fallback">
                    {fallbackInitial}
                  </div>
                )}
                <div className="public-profile-hero-copy">
                  <div className="auth-kicker">{profileLabel(profile.account_type)}</div>
                  <h1 className="auth-title">{profile.display_name}</h1>
                  {profile.location ? <p className="public-list-owner">{profile.location}</p> : null}
                  <p className="lede">
                    {profile.bio || "Curating local businesses, thoughtful lists, and better ways to discover what matters."}
                  </p>
                </div>
              </div>
              <div className="filter-chip-row">
                <span className="badge">{profile.public_lists.length} public {profile.public_lists.length === 1 ? "list" : "lists"}</span>
                <span className="badge">{profile.public_recommendations.length} recommendations</span>
                <span className="badge badge-outline">
                  {profile.account_type === "business" ? "Business voice" : "Community voice"}
                </span>
              </div>
            </article>

            {profile.public_recommendations.length > 0 ? (
              <section className="public-profile-section">
                <div className="public-profile-section-heading">
                  <h2 className="section-title">Recommendations</h2>
                  <p className="lede">Public notes about businesses this curator thinks are worth your time.</p>
                </div>
                <div className="public-list-grid">
                  {profile.public_recommendations.map((recommendation) => (
                    <article className="company-card public-list-item-card" key={recommendation.id}>
                      <div className="public-list-item-meta">
                        <span className="badge badge-outline">Recommendation</span>
                        {recommendation.company.business_category ? (
                          <span className="badge badge-muted">{recommendation.company.business_category}</span>
                        ) : null}
                      </div>
                      <h2>{recommendation.title}</h2>
                      <p className="muted">
                        About{" "}
                        <Link className="auth-text-link" href={`/companies/${recommendation.company.slug}`}>
                          {recommendation.company.name}
                        </Link>
                      </p>
                      <p>{recommendation.body}</p>
                      <div className="company-card-footer">
                        <Link className="auth-text-link" href={`/companies/${recommendation.company.slug}`}>
                          View business
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="public-profile-section">
              <div className="public-profile-section-heading">
                <h2 className="section-title">Public lists</h2>
                <p className="lede">Collections this curator has made public on FOUND.</p>
              </div>
            <section className="public-list-grid">
              {profile.public_lists.map((list) => (
                <article className="company-card public-list-item-card" key={list.id}>
                  <div className="public-list-item-meta">
                    <span className="badge badge-outline">{list.items.length} spots</span>
                    <span className="badge badge-muted">{list.is_public ? "Public" : "Private"}</span>
                  </div>
                  <h2>
                    <Link href={`/lists/${list.id_hash}`}>{list.title}</Link>
                  </h2>
                  <p>{list.description || "A thoughtful collection of businesses curated on FOUND."}</p>
                  <div className="company-card-footer">
                    <Link className="auth-text-link" href={`/lists/${list.id_hash}`}>
                      Open list
                    </Link>
                  </div>
                </article>
              ))}
            </section>
            </section>
          </section>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
