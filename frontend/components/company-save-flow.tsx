"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/components/auth-provider";
import {
  addCuratedListItem,
  createCuratedList,
  createFavorite,
  deleteFavorite,
  listCuratedLists,
  listFavorites,
} from "@/lib/api";
import { CuratedList, Favorite } from "@/types/community";

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

function isTokenError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("token") &&
    (normalized.includes("not valid") || normalized.includes("invalid") || normalized.includes("expired"))
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

export function CompanySaveFlow({ companyId }: { companyId: number }) {
  const { accessToken, getValidAccessToken, isAuthenticated, isReady, signOut, user } = useAuth();
  const heartButtonRef = useRef<HTMLElement | null>(null);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [lists, setLists] = useState<CuratedList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [newListTitle, setNewListTitle] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [isSavingList, setIsSavingList] = useState(false);
  const [showFavoritePrompt, setShowFavoritePrompt] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [favoritePromptPosition, setFavoritePromptPosition] = useState({ top: 96, left: 16 });

  const canUseSaveTools = Boolean(user?.account_type === "personal" || user?.account_type === "business");
  const canMakePublicLists = Boolean(user?.account_type === "personal" || user?.is_business_verified);
  const safeLists = normalizeLists(lists);
  const isFavorited = favoriteId !== null;

  useEffect(() => {
    async function loadSavedState() {
      if (!isReady) {
        return;
      }

      if (!isAuthenticated || !accessToken || !canUseSaveTools) {
        setIsLoading(false);
        return;
      }

      try {
        const token = await getValidAccessToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const [nextFavorites, nextLists] = await Promise.all([
          listFavorites(token),
          listCuratedLists(token),
        ]);
        const normalizedFavorites = normalizeFavorites(nextFavorites);
        const normalizedLists = normalizeLists(nextLists);
        const match = normalizedFavorites.find((favorite) => favorite.company.id === companyId);
        setFavoriteId(match?.id ?? null);
        setLists(normalizedLists);
        if (normalizedLists.length > 0) {
          setSelectedListId(String(normalizedLists[0].id));
        }
      } catch (loadError) {
        if (loadError instanceof Error && isTokenError(loadError.message)) {
          signOut();
          setError("Your session expired. Please log in again to save businesses.");
        } else {
          setError(loadError instanceof Error ? loadError.message : "Unable to load your save tools.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadSavedState();
  }, [accessToken, canUseSaveTools, companyId, isAuthenticated, isReady, signOut]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (!showFavoritePrompt) {
      return undefined;
    }

    function updateFavoritePromptPosition() {
      const trigger = heartButtonRef.current;
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
  }, [showFavoritePrompt]);

  async function handleFavoriteClick() {
    setIsSavingFavorite(true);
    setError("");
    setSuccessMessage("");

    try {
      const token = await getValidAccessToken();
      if (!token) {
        signOut();
        setError("Your session expired. Please log in again to save businesses.");
        return;
      }

      if (favoriteId) {
        await deleteFavorite(token, favoriteId);
        setFavoriteId(null);
        setShowFavoritePrompt(false);
        setShowListModal(false);
      } else {
        const favorite = await createFavorite(token, companyId);
        setFavoriteId(favorite.id);
        setShowFavoritePrompt(true);
      }
    } catch (saveError) {
      if (saveError instanceof Error && isTokenError(saveError.message)) {
        signOut();
        setError("Your session expired. Please log in again to save businesses.");
      } else {
        setError(saveError instanceof Error ? saveError.message : "Unable to update favorite.");
      }
    } finally {
      setIsSavingFavorite(false);
    }
  }

  async function handleListSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSavingList(true);
    setError("");
    setSuccessMessage("");
    let createdListId: string | null = null;

    try {
      const token = await getValidAccessToken();
      if (!token) {
        signOut();
        setError("Your session expired. Please log in again to save businesses.");
        return;
      }

      let targetListId = selectedListId;

      if (isCreatingList) {
        const nextList = await createCuratedList(token, {
          title: newListTitle,
          description: newListDescription,
          is_public: canMakePublicLists,
        });
        setLists((current) => [nextList, ...normalizeLists(current)]);
        targetListId = String(nextList.id);
        createdListId = String(nextList.id);
        setSelectedListId(String(nextList.id));
      }

      if (!targetListId) {
        throw new Error("Choose a list or create a new one first.");
      }

      const targetId = Number(targetListId);
      const alreadyInList = safeLists.some(
        (list) => list.id === targetId && list.items.some((item) => item.company.id === companyId)
      );

      if (alreadyInList) {
        setSuccessMessage("Already in that list.");
        setShowFavoritePrompt(false);
        setShowListModal(false);
        return;
      }

      const newItem = await addCuratedListItem(token, targetId, {
        company_id: companyId,
      });

      setLists((current) =>
        normalizeLists(current).map((list) =>
          list.id === targetId
            ? {
                ...list,
                items: [...list.items, newItem],
              }
            : list
        )
      );

      setSuccessMessage("Added to your list.");
      setShowFavoritePrompt(false);
      setShowListModal(false);
      setIsCreatingList(false);
      setNewListTitle("");
      setNewListDescription("");
    } catch (saveError) {
      if (createdListId) {
        setIsCreatingList(false);
      }
      if (saveError instanceof Error && isTokenError(saveError.message)) {
        signOut();
        setError("Your session expired. Please log in again to save businesses.");
      } else {
        setError(saveError instanceof Error ? saveError.message : "Unable to add this business to a list.");
      }
    } finally {
      setIsSavingList(false);
    }
  }

  function openListModal() {
    setShowFavoritePrompt(false);
    setShowListModal(true);
  }

  if (!isReady) {
    return null;
  }

  const listModal = showListModal
    ? createPortal(
        <div className="detail-save-modal-backdrop" onClick={() => setShowListModal(false)} role="presentation">
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
                onClick={() => setShowListModal(false)}
                type="button"
              >
                x
              </button>
            </div>

            {!isAuthenticated ? (
              <div className="detail-save-login">
                <p>Log in to save this business to one of your FOUND lists.</p>
                <Link className="button button-secondary" href="/login">
                  Log in
                </Link>
              </div>
            ) : (
              <form className="detail-save-modal-form" onSubmit={handleListSubmit}>
                {!isCreatingList ? (
                  <label className="detail-list-field">
                    <span className="field-label">Choose a list</span>
                    <select
                      disabled={isLoading || safeLists.length === 0}
                      onChange={(event) => setSelectedListId(event.target.value)}
                      value={selectedListId}
                    >
                      {safeLists.length === 0 ? <option value="">No lists yet</option> : null}
                      {safeLists.map((list) => (
                        <option key={list.id} value={String(list.id)}>
                          {list.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <>
                    <label className="detail-list-field">
                      <span className="field-label">New list title</span>
                      <input
                        onChange={(event) => setNewListTitle(event.target.value)}
                        required
                        value={newListTitle}
                      />
                    </label>
                    <label className="detail-list-field">
                      <span className="field-label">Description</span>
                      <textarea
                        onChange={(event) => setNewListDescription(event.target.value)}
                        rows={3}
                        value={newListDescription}
                      />
                    </label>
                    {!canMakePublicLists ? (
                      <p className="detail-list-field-meta">Lists created during verification stay private until your business is approved.</p>
                    ) : null}
                  </>
                )}

                <div className="detail-save-modal-actions">
                  {isCreatingList ? (
                    <button
                      className="button button-secondary"
                      onClick={() => setIsCreatingList(false)}
                      type="button"
                    >
                      use existing list
                    </button>
                  ) : (
                    <button
                      className="button button-secondary"
                      onClick={() => setIsCreatingList(true)}
                      type="button"
                    >
                      create new list
                    </button>
                  )}

                  <button
                    className="button button-primary"
                    disabled={isSavingList || (!isCreatingList && safeLists.length === 0)}
                    type="submit"
                  >
                    {isSavingList ? "saving..." : "add to list"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  const successToast = successMessage
    ? createPortal(
        <div className="detail-save-toast detail-save-toast-success" role="status">
          <div className="detail-save-toast-icon" aria-hidden="true">
            <HeartIcon filled />
          </div>
          <p>{successMessage}</p>
        </div>,
        document.body
      )
    : null;

  const errorToast = error
    ? createPortal(
        <div
          className="detail-save-toast detail-save-toast-error"
          role="alert"
        >
          <div className="detail-save-toast-copy">
            <p>{error}</p>
            {error.includes("Please log in again") ? (
              <Link className="detail-save-toast-link" href="/login">
                Log in
              </Link>
            ) : null}
          </div>
        </div>,
        document.body
      )
    : null;

  const favoritePrompt = showFavoritePrompt
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
            <button className="button button-primary" onClick={openListModal} type="button">
              yes please
            </button>
            <button
              className="button button-secondary"
              onClick={() => setShowFavoritePrompt(false)}
              type="button"
            >
              maybe later
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div className="detail-save-shell">
        {isAuthenticated && canUseSaveTools ? (
          <button
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            className={isFavorited ? "detail-save-heart is-active" : "detail-save-heart"}
            disabled={isLoading || isSavingFavorite}
            onClick={handleFavoriteClick}
            ref={(node) => {
              heartButtonRef.current = node;
            }}
            type="button"
          >
            <HeartIcon filled={isFavorited} />
          </button>
        ) : (
          <Link
            aria-label="Log in to save"
            className="detail-save-heart"
            href="/login"
            ref={(node) => {
              heartButtonRef.current = node;
            }}
          >
            <HeartIcon filled={false} />
          </Link>
        )}
      </div>

      {listModal}
      {favoritePrompt}
      {successToast}
      {errorToast}
    </>
  );
}
