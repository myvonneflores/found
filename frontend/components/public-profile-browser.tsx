"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getCompany } from "@/lib/api";
import { instagramProfileUrl } from "@/lib/social-links";
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

function QuickLinkLogo({
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

  return (
    <section className="dashboard-stage public-profile-browser">
      <article className="panel dashboard-banner public-profile-browser-hero">
        <div className="public-profile-browser-hero-copy">
          <h1 className="home-hero-title">{profile.display_name}</h1>
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

                <div className="directory-socials">
                  {selectedCompany.website ? (
                    <QuickLinkLogo href={selectedCompany.website} label="Website">
                      <WebsiteIcon />
                    </QuickLinkLogo>
                  ) : null}
                  {selectedCompany.linkedin_page ? (
                    <QuickLinkLogo href={selectedCompany.linkedin_page} label="LinkedIn">
                      <LinkedInIcon />
                    </QuickLinkLogo>
                  ) : null}
                  {selectedCompany.facebook_page ? (
                    <QuickLinkLogo href={selectedCompany.facebook_page} label="Facebook">
                      <FacebookIcon />
                    </QuickLinkLogo>
                  ) : null}
                  {selectedCompany.instagram_handle ? (
                    <QuickLinkLogo href={instagramProfileUrl(selectedCompany.instagram_handle)} label="Instagram">
                      <InstagramIcon />
                    </QuickLinkLogo>
                  ) : null}
                </div>

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
