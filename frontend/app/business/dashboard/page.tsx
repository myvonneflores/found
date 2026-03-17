"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BodyClass } from "@/components/body-class";
import { BusinessProfileCard } from "@/components/business-profile-card";
import { CreateListModal } from "@/components/create-list-modal";
import { FavoriteChipActions } from "@/components/favorite-chip-actions";
import { ListManager } from "@/components/list-manager";
import { SiteHeader } from "@/components/site-header";
import {
  getPersonalProfile,
  listBusinessClaims,
  listCuratedLists,
  listFavorites,
  updateCuratedList,
  updatePersonalProfile,
} from "@/lib/api";
import type { BusinessClaim } from "@/types/auth";
import { CuratedList, Favorite } from "@/types/community";
import { PersonalProfile } from "@/types/profile";

const DASHBOARD_SCROLL_CAP = 15;

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

function normalizeClaims(value: BusinessClaim[] | unknown): BusinessClaim[] {
  if (Array.isArray(value)) {
    return value as BusinessClaim[];
  }

  if (
    value &&
    typeof value === "object" &&
    "results" in value &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: BusinessClaim[] }).results;
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
  const [claims, setClaims] = useState<BusinessClaim[]>([]);
  const [profile, setProfile] = useState<PersonalProfile>({
    bio: "",
    location: "",
    avatar_url: "",
    is_public: false,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedMessage, setProfileSavedMessage] = useState("");
  const [savedProfileIsPublic, setSavedProfileIsPublic] = useState(false);
  const [mobileFavoritesOpen, setMobileFavoritesOpen] = useState(true);
  const [mobileListsOpen, setMobileListsOpen] = useState(false);
  const [mobileShareOpen, setMobileShareOpen] = useState(false);
  const safeFavorites = normalizeFavorites(favorites);
  const safeLists = normalizeLists(lists);
  const [togglingListIds, setTogglingListIds] = useState<Set<number>>(new Set());
  const latestClaim = claims.find((claim) => claim.status === "verified") ?? claims[0] ?? null;
  const hasPublicPresence = savedProfileIsPublic || safeLists.some((list) => list.is_public);
  const profileName = user?.display_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || user?.email || "";
  const profileHref = user?.public_slug ? `/profiles/${user.public_slug}` : null;

  async function toggleListPrivacy(list: CuratedList) {
    if (!accessToken) {
      setError("Unable to update list privacy right now.");
      return;
    }

    setTogglingListIds((current) => {
      const next = new Set(current);
      next.add(list.id);
      return next;
    });

    try {
      const updated = await updateCuratedList(accessToken, list.id, {
        title: list.title,
        description: list.description,
        is_public: !list.is_public,
      });

      setLists((current) => current.map((item) => (item.id === list.id ? updated : item)));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update list privacy right now.");
    } finally {
      setTogglingListIds((current) => {
        const next = new Set(current);
        next.delete(list.id);
        return next;
      });
    }
  }

  const favoritesContent = (
    <>
      {isLoading ? <p className="lede">Loading your business favorites...</p> : null}
      {!isLoading && safeFavorites.length === 0 ? (
        <p className="lede">No favorites yet. Save the local businesses you want to keep close.</p>
      ) : null}
      {!isLoading && safeFavorites.length > 0 ? (
        <div className={safeFavorites.length > DASHBOARD_SCROLL_CAP ? "dashboard-stack dashboard-scroll-region is-capped" : "dashboard-stack"}>
          {safeFavorites.map((favorite) => (
            <FavoriteChipActions favorite={favorite} key={favorite.id} />
          ))}
        </div>
      ) : null}
    </>
  );

  const listsContent = (
    <>
      {isLoading ? <p className="lede">Loading your lists...</p> : null}
      {!isLoading ? (
        <ListManager
          emptyMessage="No lists yet. Use them to spotlight neighboring businesses and share your local taste."
          enableScroll={safeLists.length > DASHBOARD_SCROLL_CAP}
          lists={safeLists}
          onCreateList={() => setIsCreateListModalOpen(true)}
          togglingListIds={togglingListIds}
          onTogglePublic={toggleListPrivacy}
        />
      ) : null}
    </>
  );

  const shareContent = (
    <>
      <form className="auth-form dashboard-profile-form" onSubmit={handleProfileSave}>
        <p className="dashboard-profile-helper">
          create a profile for easy sharing. don&apos;t see your favs listed? contribute to the community by adding a
          business listing.
        </p>
        <label className="contact-field">
          <span className="contact-field-label">Name</span>
          <input disabled value={profileName} />
        </label>
        <label className="contact-field">
          <span className="contact-field-label">Bio</span>
          <textarea
            onChange={(event) => {
              setProfile((current) => ({ ...current, bio: event.target.value }));
              setProfileSavedMessage("");
            }}
            placeholder="Tell people what you care about discovering on FOUND."
            rows={3}
            value={profile.bio}
          />
        </label>
        <div className="dashboard-profile-actions">
          <label className="detail-save-toggle-row dashboard-profile-toggle-row">
            <button
              aria-pressed={profile.is_public}
              className={profile.is_public ? "detail-save-toggle is-active" : "detail-save-toggle"}
              onClick={() => {
                setProfile((current) => ({ ...current, is_public: !current.is_public }));
                setProfileSavedMessage("");
              }}
              type="button"
            >
              <span className="detail-save-toggle-knob" />
            </button>
            <span className="detail-save-toggle-copy">
              {profile.is_public ? "you went public!" : "Make your profile public"}
            </span>
          </label>
          <button className="contact-submit dashboard-profile-save" disabled={isSavingProfile} type="submit">
            {isSavingProfile ? "Saving..." : "Save"}
          </button>
        </div>

        {hasPublicPresence && profileHref ? (
          <Link className="button button-secondary dashboard-profile-link" href={profileHref}>
            VIEW PROFILE
          </Link>
        ) : null}
        {profileSavedMessage ? <p className="contact-form-note is-success">{profileSavedMessage}</p> : null}
      </form>
    </>
  );

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      setError("Please log in again before saving your profile.");
      return;
    }

    setIsSavingProfile(true);
    setError("");

    try {
      const nextProfile = await updatePersonalProfile(accessToken, profile);
      setProfile(nextProfile);
      setSavedProfileIsPublic(nextProfile.is_public);
      setProfileSavedMessage(nextProfile.is_public ? "Your public profile is live." : "Your profile changes were saved.");
    } catch (saveError) {
      if (saveError instanceof Error && isTokenError(saveError.message)) {
        signOut();
        router.replace("/login");
        return;
      }
      setError(saveError instanceof Error ? saveError.message : "Unable to save your profile right now.");
    } finally {
      setIsSavingProfile(false);
    }
  }

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
        const [nextFavorites, nextLists, nextClaims, nextProfile] = await Promise.all([
          listFavorites(accessToken),
          listCuratedLists(accessToken),
          listBusinessClaims(accessToken),
          getPersonalProfile(accessToken),
        ]);
        setFavorites(normalizeFavorites(nextFavorites));
        setLists(normalizeLists(nextLists));
        setClaims(normalizeClaims(nextClaims));
        setProfile(nextProfile);
        setSavedProfileIsPublic(nextProfile.is_public);
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
              Save your favorite local businesses, create shareable lists, and build community with customers and
              business owners in your city.
            </p>
          </article>

          <BusinessProfileCard isVerified latestClaim={latestClaim} />

          <div className="dashboard-column-headings">
            <div className="dashboard-column-heading dashboard-column-heading-favorites">favorites</div>
            <div className="dashboard-column-heading dashboard-column-heading-lists">lists</div>
            <div className="dashboard-column-heading dashboard-column-heading-profile">community</div>
          </div>

          <section className="dashboard-board">
            <article className="panel dashboard-panel dashboard-panel-favorites">
              {favoritesContent}
            </article>

            <article className="panel dashboard-panel dashboard-panel-lists">
              {listsContent}
            </article>

            <aside className="dashboard-sidebar">
              <article className="panel dashboard-panel dashboard-panel-share dashboard-panel-profile-combined">{shareContent}</article>
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
                <span>community</span>
                <span aria-hidden="true" className={mobileShareOpen ? "directory-panel-mobile-chevron is-open" : "directory-panel-mobile-chevron"}>
                  +
                </span>
              </button>
              <div className={mobileShareOpen ? "" : "directory-mobile-collapsed"}>
                <article className="panel dashboard-panel dashboard-panel-share dashboard-panel-profile-combined">{shareContent}</article>
              </div>
            </article>
          </section>

          <article className="panel dashboard-logout-strip">
            <button className="dashboard-logout dashboard-logout-button" onClick={handleDashboardSignOut} type="button">
              Log out
            </button>
          </article>

          {error ? (
            <article className="panel dashboard-panel">
              <p className="contact-form-note is-error">{error}</p>
            </article>
          ) : null}

        </section>
      </div>

      <CreateListModal
        accessToken={accessToken}
        canMakePublic
        isOpen={isCreateListModalOpen}
        onClose={() => setIsCreateListModalOpen(false)}
        onCreated={(nextList) => {
          setLists((current) => [nextList, ...normalizeLists(current)]);
        }}
      />
    </main>
  );
}
