"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";
import {
  createSavedCuratedList,
  deleteSavedCuratedList,
  listPublicCuratedLists,
  listSavedCuratedLists,
} from "@/lib/api";
import type { PublicCuratedListPreview, SavedCuratedList } from "@/types/community";

export const dynamic = "force-dynamic";

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24">
      <path
        d="M7.5 4.5h9a1.5 1.5 0 0 1 1.5 1.5v13.2l-6-3.9-6 3.9V6a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function companyLocationLabel(company: {
  city: string;
  state: string;
  country: string;
}) {
  return [company.city, company.state, company.country].filter(Boolean).join(", ");
}

function isTokenError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("token") || normalized.includes("request failed: 401");
}

export default function PublicListsPage() {
  const router = useRouter();
  const { getValidAccessToken, isAuthenticated, isReady, signOut, user } = useAuth();
  const [query, setQuery] = useState("");
  const [lists, setLists] = useState<PublicCuratedListPreview[]>([]);
  const [savedLists, setSavedLists] = useState<SavedCuratedList[]>([]);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavedLoading, setIsSavedLoading] = useState(true);
  const [pendingListIds, setPendingListIds] = useState<Set<number>>(new Set());
  const deferredQuery = useDeferredValue(query.trim());

  useEffect(() => {
    let isActive = true;

    async function loadLists() {
      setIsLoading(true);
      setError("");

      try {
        const nextLists = await listPublicCuratedLists(deferredQuery || undefined);
        if (isActive) {
          setLists(nextLists);
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load public lists.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadLists();

    return () => {
      isActive = false;
    };
  }, [deferredQuery]);

  useEffect(() => {
    let isActive = true;

    async function loadSavedLists() {
      if (!isReady) {
        return;
      }

      if (!isAuthenticated) {
        if (isActive) {
          setSavedLists([]);
          setIsSavedLoading(false);
        }
        return;
      }

      setIsSavedLoading(true);

      try {
        const token = await getValidAccessToken();
        if (!token) {
          if (isActive) {
            setSavedLists([]);
            setIsSavedLoading(false);
          }
          return;
        }

        const nextSavedLists = await listSavedCuratedLists(token);
        if (isActive) {
          setSavedLists(nextSavedLists);
        }
      } catch (loadError) {
        if (loadError instanceof Error && isTokenError(loadError.message)) {
          signOut();
        }
        if (isActive) {
          setSavedLists([]);
        }
      } finally {
        if (isActive) {
          setIsSavedLoading(false);
        }
      }
    }

    void loadSavedLists();

    return () => {
      isActive = false;
    };
  }, [getValidAccessToken, isAuthenticated, isReady, signOut]);

  async function handleToggleSave(list: PublicCuratedListPreview) {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const currentSave = savedLists.find((savedList) => savedList.list.id === list.id);

    setPendingListIds((current) => {
      const next = new Set(current);
      next.add(list.id);
      return next;
    });
    setActionError("");

    try {
      const token = await getValidAccessToken();
      if (!token) {
        signOut();
        router.push("/login");
        return;
      }

      if (currentSave) {
        await deleteSavedCuratedList(token, currentSave.id);
        setSavedLists((current) => current.filter((savedList) => savedList.id !== currentSave.id));
      } else {
        const nextSavedList = await createSavedCuratedList(token, list.id);
        setSavedLists((current) => [nextSavedList, ...current.filter((savedList) => savedList.list.id !== list.id)]);
      }
    } catch (saveError) {
      if (saveError instanceof Error && isTokenError(saveError.message)) {
        signOut();
        router.push("/login");
        return;
      }
      setActionError(saveError instanceof Error ? saveError.message : "Unable to update this saved list.");
    } finally {
      setPendingListIds((current) => {
        const next = new Set(current);
        next.delete(list.id);
        return next;
      });
    }
  }

  return (
    <main className="page-shell directory-page-shell public-list-directory-page-shell">
      <BodyClass className="public-list-directory-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/lists" />

        <section className="dashboard-stage public-list-directory-stage">
          <article className="panel dashboard-banner public-list-directory-hero">
            <div className="public-list-directory-hero-copy">
              <h1 className="home-hero-title">Discover public lists</h1>
              <p className="lede">
                Search by list title, curator, or company name to find the local curation other people are already
                sharing.
              </p>
            </div>

            <form className="public-list-directory-hero-search" onSubmit={(event) => event.preventDefault()}>
              <label className="contact-field">
                <input
                  aria-label="Search public lists"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="search"
                  value={query}
                />
              </label>
            </form>
          </article>

          {error ? (
            <article className="panel dashboard-panel">
              <p className="contact-form-note is-error">{error}</p>
            </article>
          ) : null}

          {actionError ? (
            <article className="panel dashboard-panel">
              <p className="contact-form-note is-error">{actionError}</p>
            </article>
          ) : null}

          <section className="public-list-directory-grid">
            {isLoading ? <p className="lede">Loading public lists...</p> : null}
            {!isLoading && !error && lists.length === 0 ? (
              <article className="panel public-list-directory-card public-list-directory-empty">
                <h2>No matching lists yet</h2>
                <p className="lede">Try a different title, curator, or company search.</p>
              </article>
            ) : null}

            {!isLoading
              ? lists.map((list) => {
                  const savedMatch = savedLists.find((savedList) => savedList.list.id === list.id);
                  const isOwner = Boolean(user && user.public_slug === list.owner.public_slug);
                  const isPending = pendingListIds.has(list.id);
                  const previewCompany = list.preview_companies[0] ?? null;
                  const additionalCompanyCount = Math.max(0, list.item_count - (previewCompany ? 1 : 0));

                  return (
                    <article className="panel public-list-directory-card" key={list.id}>
                      <div className="public-list-directory-card-top">
                        {list.owner.public_slug ? (
                          <Link className="auth-text-link" href={`/profiles/${list.owner.public_slug}`}>
                            Curated by {list.owner.display_name}
                          </Link>
                        ) : (
                          <span className="muted">Curated by {list.owner.display_name}</span>
                        )}
                        {!isOwner ? (
                          <button
                            aria-label={
                              isPending
                                ? "Saving list"
                                : savedMatch
                                  ? "Unsave list"
                                  : isAuthenticated
                                    ? "Save list"
                                    : "Log in to save list"
                            }
                            aria-pressed={Boolean(savedMatch)}
                            className={
                              savedMatch
                                ? "public-list-directory-save-button is-saved"
                                : "public-list-directory-save-button"
                            }
                            disabled={isPending || isSavedLoading}
                            onClick={() => void handleToggleSave(list)}
                            type="button"
                          >
                            <BookmarkIcon filled={Boolean(savedMatch)} />
                          </button>
                        ) : (
                          <span className="public-list-directory-card-meta">Your list</span>
                        )}
                      </div>

                      <div className="public-list-directory-card-copy">
                        <h2>
                          <Link href={`/lists/${list.id_hash}`}>{list.title}</Link>
                        </h2>
                        {list.description ? <p>{list.description}</p> : null}
                      </div>

                      <div
                        className={
                          previewCompany
                            ? "public-list-directory-preview-grid"
                            : "public-list-directory-preview-grid is-empty"
                        }
                      >
                        {previewCompany ? (
                          <>
                            <Link className="public-list-directory-preview-pill" href={`/companies/${previewCompany.slug}`}>
                              <strong>{previewCompany.name}</strong>
                              <span>{companyLocationLabel(previewCompany) || "Location pending"}</span>
                            </Link>
                            {additionalCompanyCount > 0 ? (
                              <span className="public-list-directory-preview-meta">
                                +{additionalCompanyCount} more {additionalCompanyCount === 1 ? "place" : "places"}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <div className="public-list-directory-preview-empty">
                            <span className="muted">No businesses added yet.</span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              : null}
          </section>
        </section>
      </div>
    </main>
  );
}
