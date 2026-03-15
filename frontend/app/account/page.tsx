"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BodyClass } from "@/components/body-class";
import { CreateListModal } from "@/components/create-list-modal";
import { FavoriteChipActions } from "@/components/favorite-chip-actions";
import { ListManager } from "@/components/list-manager";
import { SiteHeader } from "@/components/site-header";
import {
  getPersonalProfile,
  listCuratedLists,
  listFavorites,
  updatePersonalProfile,
} from "@/lib/api";
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

function isTokenError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("token") ||
    normalized.includes("not authenticated") ||
    normalized.includes("authentication credentials were not provided") ||
    normalized.includes("request failed: 401")
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, isReady, signOut, user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [lists, setLists] = useState<CuratedList[]>([]);
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
  const hasPublicPresence = savedProfileIsPublic || safeLists.some((list) => list.is_public);
  const profileName = user?.display_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || user?.email || "";
  const profileHref = user?.public_slug ? `/profiles/${user.public_slug}` : null;

  const favoritesContent = (
    <>
      {isLoading ? <p className="lede">Loading your saved businesses...</p> : null}
      {!isLoading && safeFavorites.length === 0 ? (
        <p className="lede">You haven’t favorited any businesses yet. Save favs from the business&apos; detail page.</p>
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
          emptyMessage="No lists yet. Create your first one to start curating neighborhoods and favorites."
          enableScroll={safeLists.length > DASHBOARD_SCROLL_CAP}
          lists={safeLists}
          onCreateList={() => setIsCreateListModalOpen(true)}
        />
      ) : null}
    </>
  );

  const shareContent = (
    <>
      <form className="auth-form dashboard-profile-form" onSubmit={handleProfileSave}>
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
            PROFILE
          </Link>
        ) : null}
        {profileSavedMessage ? <p className="contact-form-note is-success">{profileSavedMessage}</p> : null}
      </form>
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

    if (user?.account_type === "business") {
      router.replace(user.is_business_verified ? "/business/dashboard" : "/business/pending");
    }
  }, [isAuthenticated, isReady, router, user]);

  useEffect(() => {
    async function loadCommunityData() {
      if (!accessToken || !user || user.account_type !== "personal") {
        setIsLoading(false);
        return;
      }

      try {
        const [nextFavorites, nextLists, nextProfile] = await Promise.all([
          listFavorites(accessToken),
          listCuratedLists(accessToken),
          getPersonalProfile(accessToken),
        ]);
        setFavorites(normalizeFavorites(nextFavorites));
        setLists(normalizeLists(nextLists));
        setProfile(nextProfile);
        setSavedProfileIsPublic(nextProfile.is_public);
      } catch (loadError) {
        if (loadError instanceof Error && isTokenError(loadError.message)) {
          signOut();
          router.replace("/login");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load your community data.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadCommunityData();
  }, [accessToken, router, signOut, user]);

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setError("Please log in again before updating your profile.");
      return;
    }

    setIsSavingProfile(true);
    setError("");
    setProfileSavedMessage("");

    try {
      const nextProfile = await updatePersonalProfile(accessToken, profile);
      setProfile(nextProfile);
      setSavedProfileIsPublic(nextProfile.is_public);
      setProfileSavedMessage("Profile updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update your profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleDashboardSignOut() {
    signOut();
    router.push("/");
  }

  if (!isReady || !user || user.account_type !== "personal") {
    return null;
  }

  return (
    <main className="page-shell directory-page-shell auth-page-shell dashboard-page-shell">
      <BodyClass className="auth-page-body dashboard-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/account" />

        <section className="dashboard-stage">
          <article className="panel dashboard-banner">
            <h1 className="home-hero-title">Dashboard</h1>
            <p className="lede">
              Save the spots you love, build a list for your next trip, and share your recommendations with your
              community.
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
              <article className="panel dashboard-panel dashboard-panel-share dashboard-panel-profile-combined">
                {shareContent}
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
        isOpen={isCreateListModalOpen}
        onClose={() => setIsCreateListModalOpen(false)}
        onCreated={(nextList) => {
          setLists((current) => [nextList, ...normalizeLists(current)]);
        }}
      />
    </main>
  );
}
