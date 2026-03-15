"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BodyClass } from "@/components/body-class";
import { useAuth } from "@/components/auth-provider";
import { EditListModal } from "@/components/edit-list-modal";
import { SiteHeader } from "@/components/site-header";
import {
  deleteCuratedList,
  getCompany,
  getCuratedListByHash,
  getPublicCuratedList,
} from "@/lib/api";
import { instagramProfileUrl } from "@/lib/social-links";
import type { CompanyDetail } from "@/types/company";
import type { CuratedListItem, PublicCuratedList } from "@/types/community";

export const dynamic = "force-dynamic";

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

function shareLabel(ownerName: string) {
  if (!ownerName.trim()) {
    return "Curated by FOUND";
  }
  return `Curated by ${ownerName}`;
}

export default function CuratedListPage() {
  const params = useParams<{ idHash: string }>();
  const router = useRouter();
  const { accessToken, isAuthenticated, isReady, user } = useAuth();
  const [list, setList] = useState<PublicCuratedList | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const idHash = typeof params?.idHash === "string" ? params.idHash : "";

  useEffect(() => {
    if (!shareFeedback) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setShareFeedback(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [shareFeedback]);

  useEffect(() => {
    if (!idHash || !isReady) {
      return;
    }

    let isActive = true;

    async function loadList() {
      setIsLoading(true);
      setError("");

      try {
        const publicList = await getPublicCuratedList(idHash);
        if (!isActive) {
          return;
        }
        setList(publicList);
      } catch (publicError) {
        if (!accessToken || !isAuthenticated) {
          if (isActive) {
            setError(publicError instanceof Error ? publicError.message : "Unable to load this list.");
            setIsLoading(false);
          }
          return;
        }

        try {
          const ownerList = await getCuratedListByHash(accessToken, idHash);
          if (!isActive) {
            return;
          }
          setList(ownerList);
        } catch (ownerError) {
          if (isActive) {
            setError(ownerError instanceof Error ? ownerError.message : "Unable to load this list.");
          }
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadList();

    return () => {
      isActive = false;
    };
  }, [accessToken, idHash, isAuthenticated, isReady]);

  useEffect(() => {
    if (!list) {
      setSelectedItemId(null);
      return;
    }

    if (list.items.length === 0) {
      setSelectedItemId(null);
      return;
    }

    setSelectedItemId((current) => {
      const hasCurrent = current ? list.items.some((item) => item.id === current) : false;
      return hasCurrent ? current : list.items[0].id;
    });
  }, [list]);

  const selectedItem = useMemo(
    () => list?.items.find((item) => item.id === selectedItemId) ?? null,
    [list, selectedItemId]
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

  const isOwner = Boolean(list && user && list.owner.public_slug === user.public_slug);
  const canMakePublic = Boolean(user?.account_type === "personal" || user?.is_business_verified);
  const ownerDisplayName = list?.owner.display_name || "Curator";
  const ownerProfileHref = list?.owner.public_slug ? `/profiles/${list.owner.public_slug}` : null;
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

  async function handleShare() {
    const url = window.location.href;
    const title = list?.title || "FOUND list";
    const text = `Check out ${title} on FOUND.`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setShareFeedback("Shared");
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareFeedback("Link copied");
    } catch {
      setShareFeedback("Unable to share right now");
    }
  }

  async function handleDelete() {
    if (!list || !accessToken) {
      return;
    }

    const confirmed = window.confirm(`Delete "${list.title}"?`);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await deleteCuratedList(accessToken, list.id);
      router.push(user?.account_type === "business" ? "/business/dashboard" : "/account");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this list.");
      setIsDeleting(false);
    }
  }

  return (
    <main className="page-shell directory-page-shell public-list-page-shell">
      <BodyClass className="public-list-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey={`/lists/${idHash}`} />

        <section className="public-list-stage list-browser-stage">
          {isLoading ? (
            <div className="company-card public-list-hero-card">
              <h1 className="auth-title">Loading list…</h1>
            </div>
          ) : error || !list ? (
            <div className="company-card public-list-hero-card">
              <h1 className="auth-title">List unavailable</h1>
              <p className="lede">{error || "We couldn't find that list."}</p>
            </div>
          ) : (
            <>
              <article className="public-list-hero-card list-browser-curator-strip">
                {ownerProfileHref ? (
                  <Link className="list-browser-curator-link" href={ownerProfileHref}>
                    {shareLabel(ownerDisplayName)}
                  </Link>
                ) : (
                  <p>{shareLabel(ownerDisplayName)}</p>
                )}
              </article>

              <section className="list-browser-frame">
                <div className="list-browser-layout">
                  <aside className="list-browser-sidebar">
                    <div className="list-browser-sidebar-copy">
                      <h1>{list.title}</h1>
                      {list.description ? <p>{list.description}</p> : null}
                    </div>

                    <div className="list-browser-company-list">
                      {list.items.length ? (
                        list.items.map((item: CuratedListItem) => {
                          const isActive = item.id === selectedItemId;
                          const meta = [item.company.city, item.company.state].filter(Boolean).join(", ");

                          return (
                            <button
                              className={isActive ? "list-browser-company-button is-active" : "list-browser-company-button"}
                              key={item.id}
                              onClick={() => setSelectedItemId(item.id)}
                              type="button"
                            >
                              <span className="list-browser-company-button-name">{item.company.name}</span>
                              {meta ? (
                                <span className="list-browser-company-button-meta">{meta}</span>
                              ) : null}
                            </button>
                          );
                        })
                      ) : (
                        <p className="lede">This list doesn’t have any saved businesses yet.</p>
                      )}
                    </div>
                  </aside>

                  <section className="list-browser-detail-panel">
                    <div className="directory-panel-surface list-browser-detail-surface">
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
                                <QuickLinkLogo
                                  href={instagramProfileUrl(selectedCompany.instagram_handle)}
                                  label="Instagram"
                                >
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
                          <p className="lede">Select a saved spot from the left to explore it here.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  <aside className="list-browser-actions-card">
                    {shareFeedback ? (
                      <div className="list-browser-actions-header">
                        <p>{shareFeedback}</p>
                      </div>
                    ) : null}

                    <div className="list-browser-actions">
                      {isOwner ? (
                        <>
                          <button className="list-browser-action-button" onClick={() => setIsEditOpen(true)} type="button">
                            Edit
                          </button>
                          <button className="list-browser-action-button" onClick={handleShare} type="button">
                            Share
                          </button>
                          <button
                            className="list-browser-action-button is-danger"
                            disabled={isDeleting}
                            onClick={handleDelete}
                            type="button"
                          >
                            {isDeleting ? "Deleting…" : "Delete"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="list-browser-action-button" onClick={handleShare} type="button">
                            Share
                          </button>
                          {ownerProfileHref ? (
                            <Link className="list-browser-action-button" href={ownerProfileHref}>
                              See More
                            </Link>
                          ) : null}
                        </>
                      )}
                    </div>
                  </aside>
                </div>
              </section>

              <EditListModal
                accessToken={accessToken}
                canMakePublic={canMakePublic}
                isOpen={isEditOpen}
                list={list}
                onClose={() => setIsEditOpen(false)}
                onItemRemoved={(itemId) => {
                  setList((current) => {
                    if (!current) {
                      return current;
                    }

                    const nextItems = current.items.filter((item) => item.id !== itemId);
                    return {
                      ...current,
                      items: nextItems,
                    };
                  });
                  setSelectedCompany((current) => (selectedItemId === itemId ? null : current));
                  setSelectedItemId((current) => (current === itemId ? null : current));
                }}
                onUpdated={(nextList) => {
                  setList((current) =>
                    current
                      ? {
                          ...current,
                          ...nextList,
                          owner: current.owner,
                        }
                      : null
                  );
                }}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
