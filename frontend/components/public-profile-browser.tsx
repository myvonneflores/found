"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CompanySocialLinks } from "@/components/company-social-links";
import { getCompany } from "@/lib/api";
import { UserBadge } from "@/components/user-badge";
import type { CompanyDetail } from "@/types/company";
import type { CuratedListItem } from "@/types/community";
import type { PublicProfile } from "@/types/profile";

function locationLabel(company: {
  city: string;
  state: string;
  country: string;
}) {
  return [company.city, company.state, company.country].filter(Boolean).join(", ");
}

function displayLabel(value: string) {
  const labels: Record<string, string> = {
    "Carries Locally Made Goods": "Locally Made Goods",
    "Focused on Sustainable Products and/or Services": "Sustainable Products",
    "Independent Designers and/or Makers": "Independent Designers and Makers",
  };

  return labels[value] ?? value;
}

export function PublicProfileBrowser({ profile }: { profile: PublicProfile }) {
  const [selectedListId, setSelectedListId] = useState<number | null>(profile.public_lists[0]?.id ?? null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(profile.public_lists[0]?.items[0]?.id ?? null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState("");

  const selectedList = useMemo(
    () => profile.public_lists.find((list) => list.id === selectedListId) ?? profile.public_lists[0] ?? null,
    [profile.public_lists, selectedListId]
  );

  useEffect(() => {
    if (!selectedList) {
      setSelectedItemId(null);
      return;
    }

    setSelectedItemId((current) => {
      const hasCurrent = current ? selectedList.items.some((item) => item.id === current) : false;
      return hasCurrent ? current : selectedList.items[0]?.id ?? null;
    });
  }, [selectedList]);

  const selectedItem = useMemo(
    () => selectedList?.items.find((item) => item.id === selectedItemId) ?? null,
    [selectedItemId, selectedList]
  );

  useEffect(() => {
    if (!selectedItem) {
      setSelectedCompany(null);
      setCompanyError("");
      return;
    }

    let isActive = true;
    const item = selectedItem;

    async function loadCompany() {
      setCompanyLoading(true);
      setCompanyError("");

      try {
        const detail = await getCompany(item.company.slug);
        if (isActive) {
          setSelectedCompany(detail);
        }
      } catch (loadError) {
        if (isActive) {
          setSelectedCompany(null);
          setCompanyError(loadError instanceof Error ? loadError.message : "Unable to load this business.");
        }
      } finally {
        if (isActive) {
          setCompanyLoading(false);
        }
      }
    }

    void loadCompany();

    return () => {
      isActive = false;
    };
  }, [selectedItem]);

  const selectedLocation = selectedCompany ? locationLabel(selectedCompany) : "";
  const selectedMapQuery = selectedCompany
    ? [
        selectedCompany.address,
        selectedCompany.city,
        selectedCompany.state,
        selectedCompany.zip_code,
        selectedCompany.country,
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  const detailListItems = selectedCompany
    ? [
        ...selectedCompany.ownership_markers.map((item) => displayLabel(item.name)),
        ...selectedCompany.sustainability_markers.map((item) => displayLabel(item.name)),
      ]
    : [];
  const productSummary = selectedCompany
    ? [
        ...(selectedCompany.business_category ? [selectedCompany.business_category.name] : []),
        ...selectedCompany.product_categories.map((item) => item.name),
        ...selectedCompany.cuisine_types.map((item) => item.name),
      ]
    : [];
  const hasCompactDetailList = detailListItems.length > 4;
  const heroBadges = profile.badges.filter((badge) => badge.slug === "community-contributor");
  const stackedBadges = profile.badges.filter((badge) => badge.slug !== "community-contributor");
  const profileTitle = profile.account_type === "business" && profile.business_company_slug ? (
    <Link className="public-profile-hero-title-link" href={`/companies/${profile.business_company_slug}`}>
      {profile.display_name}
    </Link>
  ) : (
    profile.display_name
  );

  return (
    <section className="dashboard-stage public-profile-browser">
      <article className="panel dashboard-banner public-profile-browser-hero">
        <div className="public-profile-browser-hero-copy">
          <div className="public-profile-hero-heading">
            <h1 className="home-hero-title">{profileTitle}</h1>
            {heroBadges.map((badge) => (
              <UserBadge badge={badge} className="public-profile-hero-badge" key={badge.slug} size={84} />
            ))}
          </div>
          {stackedBadges.length ? (
            <div className="profile-badge-row">
              {stackedBadges.map((badge) => (
                <UserBadge badge={badge} key={badge.slug} size={72} />
              ))}
            </div>
          ) : null}
          {profile.bio ? <p className="lede">{profile.bio}</p> : null}
        </div>
      </article>

      <div className="public-profile-browser-headings">
        <div className="dashboard-column-heading dashboard-column-heading-favorites">lists</div>
        <div className="dashboard-column-heading dashboard-column-heading-lists">
          {selectedList?.title || "list"}
        </div>
        <div className="dashboard-column-heading dashboard-column-heading-profile">
          {selectedCompany ? selectedCompany.name : "business"}
        </div>
      </div>

      <section className="public-profile-browser-board">
        <article className="panel dashboard-panel dashboard-panel-favorites public-profile-browser-panel">
          <div className="dashboard-panel-mobile-heading dashboard-column-heading dashboard-column-heading-favorites">
            lists
          </div>
          <div className="public-profile-browser-list-rail">
            {profile.public_lists.length ? (
              profile.public_lists.map((list) => (
                <button
                  className={
                    list.id === selectedList?.id
                      ? "public-profile-browser-chip is-active"
                      : "public-profile-browser-chip"
                  }
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  type="button"
                >
                  <span className="public-profile-browser-chip-name">{list.title}</span>
                  <span className="public-profile-browser-chip-meta">
                    {list.items.length} saved {list.items.length === 1 ? "place" : "places"}
                  </span>
                </button>
              ))
            ) : (
              <p className="lede">No public lists yet.</p>
            )}
          </div>
        </article>

        <article className="panel dashboard-panel dashboard-panel-lists public-profile-browser-panel">
          <div className="dashboard-panel-mobile-heading dashboard-column-heading dashboard-column-heading-lists">
            {selectedList?.title || "list"}
          </div>
          <div className="public-profile-browser-company-rail">
            {selectedList?.items.length ? (
              selectedList.items.map((item: CuratedListItem) => {
                const meta = [item.company.city, item.company.state].filter(Boolean).join(", ");

                return (
                  <button
                    className={
                      item.id === selectedItem?.id
                        ? "public-profile-browser-chip is-active"
                        : "public-profile-browser-chip"
                    }
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    type="button"
                  >
                    <span className="public-profile-browser-chip-name">{item.company.name}</span>
                    {meta ? <span className="public-profile-browser-chip-meta">{meta}</span> : null}
                  </button>
                );
              })
            ) : (
              <p className="lede">This list doesn’t have any businesses yet.</p>
            )}
          </div>
        </article>

        <article className="panel dashboard-panel dashboard-panel-share public-profile-browser-panel public-profile-browser-detail">
          <div className="dashboard-panel-mobile-heading dashboard-column-heading dashboard-column-heading-profile">
            {selectedCompany ? selectedCompany.name : "business"}
          </div>
          {selectedCompany ? (
            <div className="directory-detail-body">
              <div className="directory-detail-header-grid">
                <div className="directory-detail-head">
                  <h2>
                    <Link href={`/companies/${selectedCompany.slug}`}>{selectedCompany.name}</Link>
                  </h2>
                </div>

                <CompanySocialLinks
                  className="directory-socials"
                  facebookPage={selectedCompany.facebook_page}
                  instagramHandle={selectedCompany.instagram_handle}
                  linkedinPage={selectedCompany.linkedin_page}
                  website={selectedCompany.website}
                />

                <div className="directory-detail-address">
                  {selectedCompany.address ? <p>{selectedCompany.address}</p> : null}
                  <p>{selectedLocation}</p>
                </div>
              </div>

              <div
                className={
                  detailListItems.length
                    ? hasCompactDetailList
                      ? "directory-detail-layout is-compact-copy"
                      : "directory-detail-layout"
                    : "directory-detail-layout is-media-only"
                }
              >
                {detailListItems.length ? (
                  <div className="directory-detail-copy">
                    <ul className="directory-detail-list">
                      {detailListItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                      {selectedItem?.note ? <li>{selectedItem.note}</li> : null}
                    </ul>
                  </div>
                ) : null}

                <div className="directory-detail-media">
                  {selectedMapQuery ? (
                    <div className="directory-detail-map">
                      <iframe
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(selectedMapQuery)}&output=embed`}
                        title={`Map for ${selectedCompany.name}`}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              {productSummary.length ? (
                <div className="directory-detail-products">
                  {productSummary.map((item) => (
                    <span className="badge-outline" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : companyLoading ? (
            <div className="empty-state">
              <h2 className="section-title">Loading business…</h2>
            </div>
          ) : companyError ? (
            <div className="empty-state">
              <h2 className="section-title">Business unavailable</h2>
              <p className="lede">{companyError}</p>
            </div>
          ) : (
            <div className="empty-state">
              <h2 className="section-title">Choose a business</h2>
              <p className="lede">Pick a saved place from the middle column to open it here.</p>
            </div>
          )}
        </article>
      </section>
    </section>
  );
}
