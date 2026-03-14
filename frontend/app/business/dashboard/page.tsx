"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BodyClass } from "@/components/body-class";
import { CreateListModal } from "@/components/create-list-modal";
import { FavoriteChipActions } from "@/components/favorite-chip-actions";
import { ListManager } from "@/components/list-manager";
import { SiteHeader } from "@/components/site-header";
import { listCuratedLists, listFavorites } from "@/lib/api";
import { CuratedList, Favorite } from "@/types/community";

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

function normalizeLists(value: CuratedList[] | unknown): CuratedList[] {
  if (Array.isArray(value)) {
    return value as CuratedList[];
  }

  if (
    value &&
    typeof value === "object" &&
    "results" in value &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: CuratedList[] }).results;
  }

  return [];
}

function isTokenError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("token") ||
    normalized.includes("not authenticated") ||
    normalized.includes("authentication credentials were not provided") ||
    normalized.includes("request failed: 401")
  );
}

export default function BusinessDashboardPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, isReady, signOut, user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [lists, setLists] = useState<CuratedList[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [mobileFavoritesOpen, setMobileFavoritesOpen] = useState(true);
  const [mobileListsOpen, setMobileListsOpen] = useState(false);
  const [mobileShareOpen, setMobileShareOpen] = useState(false);
  const safeFavorites = normalizeFavorites(favorites);
  const safeLists = normalizeLists(lists);
  const hasPublicPresence = safeLists.some((list) => list.is_public);
  const profileHref = user?.public_slug ? `/profiles/${user.public_slug}` : null;

  const favoritesContent = (
    <>
      {isLoading ? <p className="lede">Loading your business favorites...</p> : null}
      {!isLoading && safeFavorites.length === 0 ? (
        <p className="lede">No favorites yet. Save aligned local businesses directly from their detail pages.</p>
      ) : null}
      {!isLoading && safeFavorites.length > 0 ? (
        <div className="dashboard-stack">
          {safeFavorites.map((favorite) => (
            <FavoriteChipActions favorite={favorite} key={favorite.id} />
          ))}
        </div>
      ) : null}
    </>
  );

  const listsContent = (
    <>
      <p className="lede">Create themed lists you can text, email, or link from your socials.</p>
      {isLoading ? <p className="lede">Loading your lists...</p> : null}
      {!isLoading ? (
        <ListManager
          emptyMessage="No lists yet. Use them to spotlight neighboring businesses and local favorites."
          lists={safeLists}
          onCreateList={() => setIsCreateListModalOpen(true)}
        />
      ) : null}
    </>
  );

  const shareContent = (
    <>
      <p className="lede">
        Every public list gets its own page, so you can send it directly to customers or drop it into a Linktree,
        newsletter, or story.
      </p>
      {hasPublicPresence && profileHref ? (
        <Link className="button button-secondary" href={profileHref}>
          View public profile
        </Link>
      ) : (
        <p className="muted">Make a list public to create something shareable from your FOUND dashboard.</p>
      )}
    </>
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (user?.account_type !== "business") {
      router.replace("/account");
      return;
    }

    if (!user.is_business_verified) {
      router.replace("/business/pending");
    }
  }, [isAuthenticated, isReady, router, user]);

  useEffect(() => {
    async function loadCommunityData() {
      if (!accessToken || !user || !user.is_business_verified) {
        setIsLoading(false);
        return;
      }

      try {
        const [nextFavorites, nextLists] = await Promise.all([
          listFavorites(accessToken),
          listCuratedLists(accessToken),
        ]);
        setFavorites(normalizeFavorites(nextFavorites));
        setLists(normalizeLists(nextLists));
      } catch (loadError) {
        if (loadError instanceof Error && isTokenError(loadError.message)) {
          signOut();
          router.replace("/login");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load your community tools.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadCommunityData();
  }, [accessToken, router, signOut, user]);

  function handleDashboardSignOut() {
    signOut();
    router.push("/");
  }

  if (!isReady || !user || user.account_type !== "business" || !user.is_business_verified) {
    return null;
  }

  return (
    <main className="page-shell directory-page-shell auth-page-shell dashboard-page-shell">
      <BodyClass className="auth-page-body dashboard-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/business/dashboard" />

        <section className="dashboard-stage">
          <article className="panel dashboard-banner dashboard-banner-business">
            <h1 className="home-hero-title">Dashboard</h1>
            <p className="lede">
              Build public lists your followers can open anywhere, save favorite local businesses, and share the parts
              of your brand taste you want people to discover.
            </p>
          </article>

          <div className="dashboard-column-headings">
            <div className="dashboard-column-heading dashboard-column-heading-favorites">favorites</div>
            <div className="dashboard-column-heading dashboard-column-heading-lists">lists</div>
            <div className="dashboard-column-heading dashboard-column-heading-profile">share</div>
          </div>

          <section className="dashboard-board">
            <article className="panel dashboard-panel dashboard-panel-favorites">
              {favoritesContent}
            </article>

            <article className="panel dashboard-panel dashboard-panel-lists">
              {listsContent}
            </article>

            <aside className="dashboard-sidebar">
              <article className="panel dashboard-panel dashboard-panel-share">
                {shareContent}
              </article>

              <article className="panel dashboard-panel dashboard-panel-profile">
                <p className="lede">
                  Your profile already aggregates public lists. Business profile editing can stay separate from this
                  curation dashboard.
                </p>
                <Link className="contact-submit" href="/companies">
                  Browse businesses
                </Link>
                <button className="dashboard-logout" onClick={handleDashboardSignOut} type="button">
                  Log out
                </button>
              </article>
            </aside>
          </section>

          <section className="dashboard-mobile-sections">
            <article className="dashboard-mobile-section">
              <button
                aria-expanded={mobileFavoritesOpen}
                className="dashboard-column-heading dashboard-column-heading-favorites directory-panel-mobile-toggle"
                onClick={() => setMobileFavoritesOpen((open) => !open)}
                type="button"
              >
                <span>favorites</span>
                <span aria-hidden="true" className={mobileFavoritesOpen ? "directory-panel-mobile-chevron is-open" : "directory-panel-mobile-chevron"}>
                  +
                </span>
              </button>
              <div className={mobileFavoritesOpen ? "" : "directory-mobile-collapsed"}>
                <article className="panel dashboard-panel dashboard-panel-favorites">{favoritesContent}</article>
              </div>
            </article>

            <article className="dashboard-mobile-section">
              <button
                aria-expanded={mobileListsOpen}
                className="dashboard-column-heading dashboard-column-heading-lists directory-panel-mobile-toggle"
                onClick={() => setMobileListsOpen((open) => !open)}
                type="button"
              >
                <span>lists</span>
                <span aria-hidden="true" className={mobileListsOpen ? "directory-panel-mobile-chevron is-open" : "directory-panel-mobile-chevron"}>
                  +
                </span>
              </button>
              <div className={mobileListsOpen ? "" : "directory-mobile-collapsed"}>
                <article className="panel dashboard-panel dashboard-panel-lists">{listsContent}</article>
              </div>
            </article>

            <article className="dashboard-mobile-section">
              <button
                aria-expanded={mobileShareOpen}
                className="dashboard-column-heading dashboard-column-heading-profile directory-panel-mobile-toggle"
                onClick={() => setMobileShareOpen((open) => !open)}
                type="button"
              >
                <span>share</span>
                <span aria-hidden="true" className={mobileShareOpen ? "directory-panel-mobile-chevron is-open" : "directory-panel-mobile-chevron"}>
                  +
                </span>
              </button>
              <div className={mobileShareOpen ? "" : "directory-mobile-collapsed"}>
                <article className="panel dashboard-panel dashboard-panel-share">{shareContent}</article>
              </div>
            </article>
          </section>

          {error ? (
            <article className="panel dashboard-panel">
              <p className="contact-form-note is-error">{error}</p>
            </article>
          ) : null}

        </section>
      </div>

      <CreateListModal
        accessToken={accessToken}
        isOpen={isCreateListModalOpen}
        onClose={() => setIsCreateListModalOpen(false)}
        onCreated={(nextList) => {
          setLists((current) => [nextList, ...normalizeLists(current)]);
        }}
      />
    </main>
  );
}
