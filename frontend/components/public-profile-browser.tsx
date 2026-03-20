"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import { AddCompanyToList } from "@/components/add-company-to-list";
import { useAuth } from "@/components/auth-provider";
import { CompanySocialLinks } from "@/components/company-social-links";
import { UserBadge } from "@/components/user-badge";
import {
  createFavorite,
  createSavedCuratedList,
  deleteFavorite,
  deleteSavedCuratedList,
  getCompany,
  listFavorites,
  listSavedCuratedLists,
} from "@/lib/api";
import type { CompanyDetail } from "@/types/company";
import type { CuratedListItem, Favorite, SavedCuratedList } from "@/types/community";
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

function normalizeFavorites(value: Favorite[] | unknown): Favorite[] {
  if (Array.isArray(value)) {
    return value as Favorite[];
  }

  if (
    value &&
    typeof value === "object" &&
    "results" in value &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: Favorite[] }).results;
  }

  return [];
}

function normalizeSavedLists(value: SavedCuratedList[] | unknown): SavedCuratedList[] {
  if (Array.isArray(value)) {
    return value as SavedCuratedList[];
  }

  if (
    value &&
    typeof value === "object" &&
    "results" in value &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: SavedCuratedList[] }).results;
  }

  return [];
}

function isTokenError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("token") || normalized.includes("request failed: 401");
}

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

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24">
      <path
        d="M12 20.4 4.95 13.9A4.7 4.7 0 0 1 3.5 10.4c0-2.63 2-4.65 4.54-4.65 1.54 0 2.91.75 3.96 2.02 1.05-1.27 2.42-2.02 3.96-2.02 2.54 0 4.54 2.02 4.54 4.65 0 1.32-.52 2.57-1.45 3.5L12 20.4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function PublicProfileBrowser({ profile }: { profile: PublicProfile }) {
  const router = useRouter();
  const { getValidAccessToken, isAuthenticated, isReady, signOut, user } = useAuth();
  const [selectedListId, setSelectedListId] = useState<number | null>(profile.public_lists[0]?.id ?? null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(profile.public_lists[0]?.items[0]?.id ?? null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savedListMap, setSavedListMap] = useState<Record<number, number>>({});
  const [favoriteMap, setFavoriteMap] = useState<Record<number, number>>({});
  const [pendingListIds, setPendingListIds] = useState<Set<number>>(new Set());
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<Set<number>>(new Set());
  const [isSaveStateLoading, setIsSaveStateLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState("");
  const [favoritePromptCompany, setFavoritePromptCompany] = useState<{ id: number; slug: string } | null>(null);
  const [favoritePromptPosition, setFavoritePromptPosition] = useState({ top: 96, left: 16 });
  const [listPromptCompanyId, setListPromptCompanyId] = useState<number | null>(null);
  const [activeListMenu, setActiveListMenu] = useState<{ listId: number; top: number; left: number } | null>(null);
  const favoritePromptAnchorRef = useRef<HTMLButtonElement | null>(null);
  const listMenuRef = useRef<HTMLDivElement | null>(null);
  const canUseSaveTools = Boolean(user?.account_type === "personal" || user?.account_type === "business");

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
  const favoritePrompt =
    favoritePromptCompany && typeof document !== "undefined"
      ? createPortal(
          <div
            className="detail-save-popover detail-save-popover-floating"
            role="status"
            style={{
              left: `${favoritePromptPosition.left}px`,
              top: `${favoritePromptPosition.top}px`,
            }}
          >
            <p>Added to favorites! Wanna add it to a list too?</p>
            <div className="detail-save-popover-actions">
              <button
                className="button button-primary"
                onClick={() => {
                  setListPromptCompanyId(favoritePromptCompany.id);
                  setFavoritePromptCompany(null);
                }}
                type="button"
              >
                yes please
              </button>
              <button className="button button-secondary" onClick={() => setFavoritePromptCompany(null)} type="button">
                maybe later
              </button>
            </div>
          </div>,
          document.body
        )
      : null;
  const listPromptModal =
    listPromptCompanyId && typeof document !== "undefined"
      ? createPortal(
          <div className="detail-save-modal-backdrop" onClick={() => setListPromptCompanyId(null)} role="presentation">
            <div
              aria-modal="true"
              className="detail-save-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <div className="detail-save-modal-header">
                <div>
                  <strong>Add to a list</strong>
                  <p>Pick an existing list or create a new one.</p>
                </div>
                <button
                  aria-label="Close add to list dialog"
                  className="detail-save-close"
                  onClick={() => setListPromptCompanyId(null)}
                  type="button"
                >
                  x
                </button>
              </div>

              <AddCompanyToList companyId={listPromptCompanyId} onAdded={() => setListPromptCompanyId(null)} />
            </div>
          </div>,
          document.body
        )
      : null;
  const errorToast =
    actionError && typeof document !== "undefined"
      ? createPortal(
          <div className="detail-save-toast detail-save-toast-error" role="alert">
            <div className="detail-save-toast-copy">
              <p>{actionError}</p>
            </div>
          </div>,
          document.body
        )
      : null;
  const feedbackToast =
    actionFeedback && typeof document !== "undefined"
      ? createPortal(
          <div className="detail-save-toast detail-save-toast-share" role="status">
            <div className="detail-save-toast-copy">
              <p>{actionFeedback}</p>
            </div>
          </div>,
          document.body
        )
      : null;
  const activeMenuList = activeListMenu
    ? profile.public_lists.find((list) => list.id === activeListMenu.listId) ?? null
    : null;
  const listActionsMenu =
    activeListMenu && activeMenuList && typeof document !== "undefined"
      ? createPortal(
          <div
            className="public-profile-browser-list-menu"
            ref={listMenuRef}
            role="menu"
            style={{
              left: `${activeListMenu.left}px`,
              top: `${activeListMenu.top}px`,
            }}
          >
            <button
              className="public-profile-browser-list-menu-item"
              onClick={() => {
                void handleToggleSavedList(activeMenuList.id);
                setActiveListMenu(null);
              }}
              type="button"
            >
              {savedListMap[activeMenuList.id] ? "Unsave" : "Save"}
            </button>
            <button
              className="public-profile-browser-list-menu-item"
              onClick={() => {
                void handleShareList(activeMenuList);
                setActiveListMenu(null);
              }}
              type="button"
            >
              Share
            </button>
            <button
              className="public-profile-browser-list-menu-item"
              onClick={() => {
                router.push(`/lists/${activeMenuList.id_hash}`);
                setActiveListMenu(null);
              }}
              type="button"
            >
              Open
            </button>
          </div>,
          document.body
        )
      : null;

  useEffect(() => {
    if (!favoritePromptCompany) {
      return undefined;
    }

    function updateFavoritePromptPosition() {
      const trigger = favoritePromptAnchorRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const promptWidth = Math.min(336, window.innerWidth - 32);
      const left = Math.min(
        Math.max(16, rect.right - promptWidth),
        Math.max(16, window.innerWidth - promptWidth - 16)
      );
      const top = Math.min(rect.bottom + 12, window.innerHeight - 180);

      setFavoritePromptPosition({ top, left });
    }

    updateFavoritePromptPosition();
    window.addEventListener("resize", updateFavoritePromptPosition);
    window.addEventListener("scroll", updateFavoritePromptPosition, true);

    return () => {
      window.removeEventListener("resize", updateFavoritePromptPosition);
      window.removeEventListener("scroll", updateFavoritePromptPosition, true);
    };
  }, [favoritePromptCompany]);

  useEffect(() => {
    if (!actionError) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setActionError(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [actionError]);

  useEffect(() => {
    if (!actionFeedback) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setActionFeedback(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [actionFeedback]);

  useEffect(() => {
    if (!activeListMenu) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!listMenuRef.current?.contains(target)) {
        setActiveListMenu(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveListMenu(null);
      }
    }

    function handleViewportChange() {
      setActiveListMenu(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [activeListMenu]);

  useEffect(() => {
    let isActive = true;

    async function loadSaveState() {
      if (!isReady) {
        return;
      }

      if (!isAuthenticated || !canUseSaveTools) {
        if (isActive) {
          setSavedListMap({});
          setFavoriteMap({});
          setIsSaveStateLoading(false);
        }
        return;
      }

      try {
        const token = await getValidAccessToken();
        if (!token) {
          if (isActive) {
            setSavedListMap({});
            setFavoriteMap({});
            setIsSaveStateLoading(false);
          }
          return;
        }

        const [savedLists, favorites] = await Promise.all([
          listSavedCuratedLists(token),
          listFavorites(token),
        ]);

        if (!isActive) {
          return;
        }

        const nextSavedListMap = normalizeSavedLists(savedLists).reduce<Record<number, number>>((accumulator, savedList) => {
          accumulator[savedList.list.id] = savedList.id;
          return accumulator;
        }, {});
        const nextFavoriteMap = normalizeFavorites(favorites).reduce<Record<number, number>>((accumulator, favorite) => {
          accumulator[favorite.company.id] = favorite.id;
          return accumulator;
        }, {});

        setSavedListMap(nextSavedListMap);
        setFavoriteMap(nextFavoriteMap);
      } catch (loadError) {
        if (loadError instanceof Error && isTokenError(loadError.message)) {
          signOut();
        } else if (isActive) {
          setActionError(loadError instanceof Error ? loadError.message : "Unable to load save options.");
        }
      } finally {
        if (isActive) {
          setIsSaveStateLoading(false);
        }
      }
    }

    void loadSaveState();

    return () => {
      isActive = false;
    };
  }, [canUseSaveTools, getValidAccessToken, isAuthenticated, isReady, signOut]);

  async function handleToggleSavedList(listId: number) {
    if (!isAuthenticated || !canUseSaveTools) {
      router.push("/login");
      return;
    }

    setPendingListIds((current) => {
      const next = new Set(current);
      next.add(listId);
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

      const savedListId = savedListMap[listId];
      if (savedListId) {
        await deleteSavedCuratedList(token, savedListId);
        setSavedListMap((current) => {
          const next = { ...current };
          delete next[listId];
          return next;
        });
      } else {
        const savedList = await createSavedCuratedList(token, listId);
        setSavedListMap((current) => ({ ...current, [listId]: savedList.id }));
      }
    } catch (saveError) {
      if (saveError instanceof Error && isTokenError(saveError.message)) {
        signOut();
        router.push("/login");
      } else {
        setActionError(saveError instanceof Error ? saveError.message : "Unable to update this saved list.");
      }
    } finally {
      setPendingListIds((current) => {
        const next = new Set(current);
        next.delete(listId);
        return next;
      });
    }
  }

  async function handleShareList(list: PublicProfile["public_lists"][number]) {
    const url = new URL(`/lists/${list.id_hash}`, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({
          title: list.title,
          text: `Check out ${list.title} on FOUND.`,
          url,
        });
        setActionFeedback("Shared");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setActionFeedback("Link copied");
        return;
      }

      throw new Error("Clipboard unavailable");
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }

      setActionError("Unable to share right now");
    }
  }

  function toggleListMenu(
    list: PublicProfile["public_lists"][number],
    trigger: HTMLButtonElement
  ) {
    if (activeListMenu?.listId === list.id) {
      setActiveListMenu(null);
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 10.5 * 16;
    const left = Math.min(
      Math.max(16, rect.right - menuWidth),
      Math.max(16, window.innerWidth - menuWidth - 16)
    );
    const top = Math.min(rect.bottom + 10, window.innerHeight - 180);

    setActiveListMenu({
      listId: list.id,
      top,
      left,
    });
  }

  async function handleToggleFavorite(company: { id: number; slug: string }, trigger: HTMLButtonElement) {
    if (!isAuthenticated || !canUseSaveTools) {
      router.push("/login");
      return;
    }

    favoritePromptAnchorRef.current = trigger;
    setPendingFavoriteIds((current) => {
      const next = new Set(current);
      next.add(company.id);
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

      const favoriteId = favoriteMap[company.id];
      if (favoriteId) {
        await deleteFavorite(token, favoriteId);
        setFavoriteMap((current) => {
          const next = { ...current };
          delete next[company.id];
          return next;
        });
        setFavoritePromptCompany((current) => (current?.id === company.id ? null : current));
        setListPromptCompanyId((current) => (current === company.id ? null : current));
      } else {
        const favorite = await createFavorite(token, company.id);
        setFavoriteMap((current) => ({ ...current, [company.id]: favorite.id }));
        setFavoritePromptCompany(company);
      }
    } catch (saveError) {
      if (saveError instanceof Error && isTokenError(saveError.message)) {
        signOut();
        router.push("/login");
      } else {
        setActionError(saveError instanceof Error ? saveError.message : "Unable to update favorite.");
      }
    } finally {
      setPendingFavoriteIds((current) => {
        const next = new Set(current);
        next.delete(company.id);
        return next;
      });
    }
  }

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
                <div
                  className={
                    list.id === selectedList?.id
                      ? "public-profile-browser-chip-row is-active"
                      : "public-profile-browser-chip-row"
                  }
                  key={list.id}
                >
                  <button
                    className={
                      list.id === selectedList?.id
                        ? "public-profile-browser-chip is-active"
                        : "public-profile-browser-chip"
                    }
                    onClick={() => setSelectedListId(list.id)}
                    type="button"
                  >
                    <span className="public-profile-browser-chip-name">{list.title}</span>
                    <span className="public-profile-browser-chip-meta">
                      {list.items.length} saved {list.items.length === 1 ? "place" : "places"}
                    </span>
                  </button>
                  <button
                    aria-expanded={activeListMenu?.listId === list.id}
                    aria-haspopup="menu"
                    aria-label={`More actions for ${list.title}`}
                    className="public-profile-browser-chip-action public-profile-browser-chip-action-menu"
                    onClick={(event) => toggleListMenu(list, event.currentTarget)}
                    type="button"
                  >
                    <span aria-hidden="true">...</span>
                  </button>
                </div>
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
                  <div
                    className={
                      item.id === selectedItem?.id
                        ? "public-profile-browser-chip-row is-active"
                        : "public-profile-browser-chip-row"
                    }
                    key={item.id}
                    >
                      <button
                        className={
                          item.id === selectedItem?.id
                            ? "public-profile-browser-chip is-active"
                          : "public-profile-browser-chip"
                      }
                      onClick={() => setSelectedItemId(item.id)}
                      type="button"
                      >
                        <span className="public-profile-browser-chip-name">{item.company.name}</span>
                        {meta ? <span className="public-profile-browser-chip-meta">{meta}</span> : null}
                      </button>
                  </div>
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
                  <div className="directory-detail-title">
                    <h2>
                      <Link href={`/companies/${selectedCompany.slug}`}>{selectedCompany.name}</Link>
                    </h2>
                    <button
                      aria-label={
                        pendingFavoriteIds.has(selectedCompany.id)
                          ? "Saving favorite"
                          : favoriteMap[selectedCompany.id]
                            ? "Remove from favorites"
                            : isAuthenticated && canUseSaveTools
                              ? "Save to favorites"
                              : "Log in to save favorite"
                      }
                      aria-pressed={Boolean(favoriteMap[selectedCompany.id])}
                      className={`directory-company-favorite directory-detail-favorite${favoriteMap[selectedCompany.id] ? " is-active" : ""}`}
                      disabled={pendingFavoriteIds.has(selectedCompany.id) || isSaveStateLoading}
                      onClick={(event) => void handleToggleFavorite(selectedCompany, event.currentTarget)}
                      type="button"
                    >
                      <HeartIcon filled={Boolean(favoriteMap[selectedCompany.id])} />
                    </button>
                  </div>
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
      {errorToast}
      {feedbackToast}
      {favoritePrompt}
      {listPromptModal}
      {listActionsMenu}
    </section>
  );
}
