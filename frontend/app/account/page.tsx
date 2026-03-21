"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, FormEvent, useDeferredValue, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { AuthGuardShell } from "@/components/auth-guard-shell";
import { BodyClass } from "@/components/body-class";
import { CreateListModal } from "@/components/create-list-modal";
import { FavoriteChipActions } from "@/components/favorite-chip-actions";
import { ListManager } from "@/components/list-manager";
import { SavedListShelf } from "@/components/saved-list-shelf";
import { SiteHeader } from "@/components/site-header";
import {
  checkDisplayNameAvailability,
  getPersonalProfile,
  listCuratedLists,
  listFavorites,
  listSavedCuratedLists,
  updateCurrentUser,
  updateCuratedList,
  updatePersonalProfile,
} from "@/lib/api";
import { CuratedList, Favorite, SavedCuratedList } from "@/types/community";
import { PersonalProfile } from "@/types/profile";
import { DisplayNameAvailability } from "@/types/auth";

const DASHBOARD_SCROLL_CAP = 15;
const DASHBOARD_DESKTOP_BREAKPOINT = 980;

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
  const { accessToken, isAuthenticated, isReady, refreshUser, setRedirecting, signOut, user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [lists, setLists] = useState<CuratedList[]>([]);
  const [savedLists, setSavedLists] = useState<SavedCuratedList[]>([]);
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
  const [displayName, setDisplayName] = useState("");
  const deferredDisplayName = useDeferredValue(displayName);
  const [displayNameAvailability, setDisplayNameAvailability] = useState<DisplayNameAvailability | null>(null);
  const [isCheckingDisplayName, setIsCheckingDisplayName] = useState(false);
  const [mobileFavoritesOpen, setMobileFavoritesOpen] = useState(true);
  const [mobileListsOpen, setMobileListsOpen] = useState(false);
  const [mobileShareOpen, setMobileShareOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const [syncedPanelHeight, setSyncedPanelHeight] = useState<string | undefined>(undefined);
  const communityPanelRef = useRef<HTMLElement | null>(null);
  const safeFavorites = normalizeFavorites(favorites);
  const safeLists = normalizeLists(lists);
  const [togglingListIds, setTogglingListIds] = useState<Set<number>>(new Set());
  const hasPublicPresence = savedProfileIsPublic || safeLists.some((list) => list.is_public);
  const profileHref = user?.public_slug ? `/profiles/${user.public_slug}` : null;
  const hasDisplayNameChanged = displayName.trim() !== (user?.display_name ?? "").trim();
  const isDesktopDashboard = viewportWidth !== null && viewportWidth > DASHBOARD_DESKTOP_BREAKPOINT;
  const syncedPanelStyle =
    isDesktopDashboard && syncedPanelHeight
      ? ({ height: syncedPanelHeight, maxHeight: syncedPanelHeight } as CSSProperties)
      : undefined;

  async function toggleListPrivacy(list: CuratedList) {
    if (!accessToken) {
      setError("Unable to update list privacy right now.");
      return;
    }

    setTogglingListIds((current) => new Set(current).add(list.id));

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
      {isLoading ? (
        <>
          <p className="visually-hidden" role="status">Loading your saved businesses...</p>
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
        </>
      ) : null}
      {!isLoading && safeFavorites.length === 0 ? (
        <p className="lede">You haven’t favorited any businesses yet. Save favs from the business&apos; detail page.</p>
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
      {isLoading ? (
        <>
          <p className="visually-hidden" role="status">Loading your lists...</p>
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
        </>
      ) : null}
      {!isLoading ? (
        <ListManager
          emptyMessage="No lists yet. Create your first one to start curating neighborhoods and favorites."
          enableScroll={!isDesktopDashboard && safeLists.length > DASHBOARD_SCROLL_CAP}
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
      <form className="auth-form dashboard-profile-form dashboard-profile-form-with-top-actions" onSubmit={handleProfileSave}>
        <div className={`dashboard-profile-top-actions${hasPublicPresence && profileHref ? "" : " is-single"}`}>
          {hasPublicPresence && profileHref ? (
            <Link className="button button-secondary dashboard-profile-link" href={profileHref}>
              VIEW PROFILE
            </Link>
          ) : null}
          <Link className="button button-secondary dashboard-profile-link" href="/account/add-business">
            + YOUR FAV BIZ
          </Link>
        </div>
        <p className="dashboard-profile-helper">
          create a profile for easy sharing. don&apos;t see your favs listed? contribute to the community by adding a
          business listing.
        </p>
        {user?.needs_display_name_review ? (
          <p className="contact-form-note">
            We updated your display name to keep curator names unique. Pick a new one below if you&apos;d like.
          </p>
        ) : null}
        <label className="contact-field">
          <span className="contact-field-label">Display name</span>
          <input
            autoComplete="nickname"
            onChange={(event) => {
              setDisplayName(event.target.value);
              setProfileSavedMessage("");
            }}
            value={displayName}
          />
        </label>
        {isCheckingDisplayName ? (
          <p className="auth-inline-note">Checking display name availability...</p>
        ) : null}
        {!isCheckingDisplayName && hasDisplayNameChanged && displayName.trim() && displayNameAvailability?.available ? (
          <p className="contact-form-note is-success">Display name available.</p>
        ) : null}
        {!isCheckingDisplayName && hasDisplayNameChanged && displayName.trim() && displayNameAvailability && !displayNameAvailability.available ? (
          <p className="contact-form-note is-error">
            That display name is taken.
            {displayNameAvailability.suggestions.length
              ? ` Try ${displayNameAvailability.suggestions.join(", ")}.`
              : ""}
          </p>
        ) : null}
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
        {profileSavedMessage ? <p className="contact-form-note is-success">{profileSavedMessage}</p> : null}
      </form>
    </>
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateViewportWidth = () => setViewportWidth(window.innerWidth);

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);

    return () => {
      window.removeEventListener("resize", updateViewportWidth);
    };
  }, []);

  useEffect(() => {
    const communityPanel = communityPanelRef.current;

    if (!communityPanel || !isDesktopDashboard || typeof ResizeObserver === "undefined") {
      setSyncedPanelHeight(undefined);
      return;
    }

    let frame: number | null = null;

    const updateHeight = () => {
      const panelStyles = window.getComputedStyle(communityPanel);
      const borderHeight =
        Number.parseFloat(panelStyles.borderTopWidth) +
        Number.parseFloat(panelStyles.borderBottomWidth);
      const nextHeight = `${Math.ceil(communityPanel.scrollHeight + borderHeight)}px`;
      setSyncedPanelHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    const scheduleUpdate = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        updateHeight();
        frame = null;
      });
    };

    scheduleUpdate();

    const observer = new ResizeObserver(() => {
      scheduleUpdate();
    });

    observer.observe(communityPanel);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [displayName, isDesktopDashboard, profile, profileHref, profileSavedMessage, safeLists.length]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) {
      setRedirecting(true);
      router.replace("/login");
      return;
    }

    if (user?.account_type === "business") {
      setRedirecting(true);
      router.replace(user.is_business_verified ? "/business/dashboard" : "/business/pending");
    }
  }, [isAuthenticated, isReady, router, setRedirecting, user]);

  useEffect(() => {
    if (!user || user.account_type !== "personal") {
      setDisplayName("");
      return;
    }

    setDisplayName(user.display_name || user.first_name || user.email || "");
  }, [user]);

  useEffect(() => {
    async function loadDisplayNameAvailability() {
      if (!user || user.account_type !== "personal") {
        setDisplayNameAvailability(null);
        setIsCheckingDisplayName(false);
        return;
      }

      const query = deferredDisplayName.trim();
      if (!query) {
        setDisplayNameAvailability(null);
        setIsCheckingDisplayName(false);
        return;
      }

      setIsCheckingDisplayName(true);
      try {
        const nextAvailability = await checkDisplayNameAvailability(query, accessToken ?? undefined);
        setDisplayNameAvailability(nextAvailability);
      } catch {
        setDisplayNameAvailability(null);
      } finally {
        setIsCheckingDisplayName(false);
      }
    }

    void loadDisplayNameAvailability();
  }, [accessToken, deferredDisplayName, user]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!accessToken || !user || user.account_type !== "personal") {
        setFavorites([]);
        setLists([]);
        setSavedLists([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [nextFavorites, nextLists, nextProfile, nextSavedLists] = await Promise.all([
          listFavorites(accessToken),
          listCuratedLists(accessToken),
          getPersonalProfile(accessToken),
          listSavedCuratedLists(accessToken),
        ]);
        setFavorites(normalizeFavorites(nextFavorites));
        setLists(normalizeLists(nextLists));
        setProfile(nextProfile);
        setSavedProfileIsPublic(nextProfile.is_public);
        setSavedLists(nextSavedLists);
      } catch (loadError) {
        if (loadError instanceof Error && isTokenError(loadError.message)) {
          signOut();
          router.replace("/login");
          return;
        }
        setFavorites([]);
        setLists([]);
        setSavedLists([]);
        setError(loadError instanceof Error ? loadError.message : "Unable to load your community data.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboardData();
  }, [accessToken, router, signOut, user]);

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setError("Please log in again before updating your profile.");
      return;
    }

    if (!displayName.trim()) {
      setError("Please enter a display name.");
      return;
    }

    setIsSavingProfile(true);
    setError("");
    setProfileSavedMessage("");

    try {
      const displayNameChanged = hasDisplayNameChanged;

      if (displayNameChanged) {
        await updateCurrentUser(accessToken, { display_name: displayName.trim() });
        await refreshUser();
      }

      const nextProfile = await updatePersonalProfile(accessToken, profile);
      setProfile(nextProfile);
      setSavedProfileIsPublic(nextProfile.is_public);
      setProfileSavedMessage(displayNameChanged ? "Profile and display name updated." : "Profile updated.");
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
    return <AuthGuardShell />;
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
            <div className="dashboard-column-heading dashboard-column-heading-profile">community</div>
          </div>

          <section className="dashboard-board">
            <article
              className="panel dashboard-panel dashboard-panel-favorites dashboard-panel-scroll-shell"
              style={syncedPanelStyle}
            >
              <div className="dashboard-panel-scroll-region">
                {favoritesContent}
              </div>
            </article>

            <article
              className="panel dashboard-panel dashboard-panel-lists dashboard-panel-scroll-shell"
              style={syncedPanelStyle}
            >
              <div className="dashboard-panel-scroll-region">
                {listsContent}
              </div>
            </article>

            <aside className="dashboard-sidebar">
              <article
                className="panel dashboard-panel dashboard-panel-share dashboard-panel-profile-combined"
                ref={communityPanelRef}
              >
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

          <SavedListShelf isLoading={isLoading} savedLists={savedLists} />

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
