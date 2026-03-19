"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BodyClass } from "@/components/body-class";
import { useAuth } from "@/components/auth-provider";
import { CompanySocialLinks } from "@/components/company-social-links";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EditListModal } from "@/components/edit-list-modal";
import { ShareButton } from "@/components/share-button";
import { SiteHeader } from "@/components/site-header";
import {
  createSavedCuratedList,
  deleteSavedCuratedList,
  deleteCuratedList,
  getCompany,
  getCuratedListByHash,
  getPublicCuratedList,
  listSavedCuratedLists,
} from "@/lib/api";
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

function shareLabel(ownerName: string) {
  if (!ownerName.trim()) {
    return "Curated by FOUND";
  }
  return `Curated by ${ownerName}`;
}

export default function CuratedListPage() {
  const params = useParams<{ idHash: string }>();
  const router = useRouter();
  const { accessToken, getValidAccessToken, isAuthenticated, isReady, signOut, user } = useAuth();
  const [list, setList] = useState<PublicCuratedList | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [savedListId, setSavedListId] = useState<number | null>(null);
  const [isSavePending, setIsSavePending] = useState(false);
  const [saveError, setSaveError] = useState("");

  const idHash = typeof params?.idHash === "string" ? params.idHash : "";

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

  function isTokenError(message: string) {
    const normalized = message.toLowerCase();
    return normalized.includes("token") || normalized.includes("request failed: 401");
  }

  useEffect(() => {
    if (!isReady || !list || isOwner || !isAuthenticated) {
      setSavedListId(null);
      return;
    }

    let isActive = true;
    const currentListId = list.id;

    async function loadSavedState() {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          if (isActive) {
            setSavedListId(null);
          }
          return;
        }

        const savedLists = await listSavedCuratedLists(token);
        if (!isActive) {
          return;
        }
        const match = savedLists.find((savedList) => savedList.list.id === currentListId);
        setSavedListId(match?.id ?? null);
      } catch (loadError) {
        if (!isActive) {
          return;
        }
        setSaveError(loadError instanceof Error ? loadError.message : "Unable to load save state for this list.");
      }
    }

    void loadSavedState();

    return () => {
      isActive = false;
    };
  }, [getValidAccessToken, isAuthenticated, isOwner, isReady, list]);

  async function handleDelete() {
    if (!list || !accessToken) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await deleteCuratedList(accessToken, list.id);
      setIsDeleteConfirmOpen(false);
      router.push(user?.account_type === "business" ? "/business/dashboard" : "/account");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this list.");
      setIsDeleting(false);
    }
  }

  async function handleToggleSavedList() {
    if (!list) {
      return;
    }

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    setIsSavePending(true);
    setSaveError("");

    try {
      const token = await getValidAccessToken();
      if (!token) {
        signOut();
        router.push("/login");
        return;
      }

      if (savedListId) {
        await deleteSavedCuratedList(token, savedListId);
        setSavedListId(null);
      } else {
        const savedList = await createSavedCuratedList(token, list.id);
        setSavedListId(savedList.id);
      }
    } catch (saveActionError) {
      if (saveActionError instanceof Error && isTokenError(saveActionError.message)) {
        signOut();
        router.push("/login");
        return;
      }
      setSaveError(saveActionError instanceof Error ? saveActionError.message : "Unable to update this saved list.");
    } finally {
      setIsSavePending(false);
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
                  <Link className="list-browser-curator-button" href={ownerProfileHref}>
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
                          <p className="lede">Select a saved spot from the left to explore it here.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  <aside className="list-browser-actions-card">
                    <div className="list-browser-actions">
                      {isOwner ? (
                        <>
                          <button className="list-browser-action-button" onClick={() => setIsEditOpen(true)} type="button">
                            Edit
                          </button>
                          <ShareButton
                            buttonClassName="list-browser-action-button"
                            feedbackClassName="list-browser-action-feedback"
                            shareText={`Check out ${list.title} on FOUND.`}
                            shareTitle={list.title}
                            shareUrl={`/lists/${list.id_hash}`}
                            wrapperClassName="list-browser-share-action"
                          />
                          <button
                            className="list-browser-action-button is-danger"
                            disabled={isDeleting}
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            type="button"
                          >
                            {isDeleting ? "Deleting…" : "Delete"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="list-browser-action-button" onClick={handleToggleSavedList} type="button">
                            {isSavePending
                              ? "Saving..."
                              : savedListId
                                ? "Unsave list"
                                : isAuthenticated
                                  ? "Save list"
                                  : "Log in to save"}
                          </button>
                          <ShareButton
                            buttonClassName="list-browser-action-button"
                            feedbackClassName="list-browser-action-feedback"
                            shareText={`Check out ${list.title} on FOUND.`}
                            shareTitle={list.title}
                            shareUrl={`/lists/${list.id_hash}`}
                            wrapperClassName="list-browser-share-action"
                          />
                          {ownerProfileHref ? (
                            <Link className="list-browser-action-button" href={ownerProfileHref}>
                              See More
                            </Link>
                          ) : null}
                        </>
                      )}
                    </div>
                    {saveError ? <p className="contact-form-note is-error">{saveError}</p> : null}
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
              <ConfirmDialog
                confirmLabel="delete"
                isOpen={isDeleteConfirmOpen}
                isPending={isDeleting}
                message="This cannot be undone."
                onCancel={() => setIsDeleteConfirmOpen(false)}
                onConfirm={() => void handleDelete()}
                title="Delete this list?"
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
