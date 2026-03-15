"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { addCuratedListItem, createCuratedList, listCuratedLists } from "@/lib/api";
import { CuratedList } from "@/types/community";

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

export function AddCompanyToList({
  companyId,
  onAdded,
}: {
  companyId: number;
  onAdded?: () => void;
}) {
  const { accessToken, isAuthenticated, isReady, user } = useAuth();
  const [lists, setLists] = useState<CuratedList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [newListTitle, setNewListTitle] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [isCreatingNewList, setIsCreatingNewList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canUseLists = Boolean(user?.account_type === "personal" || user?.account_type === "business");
  const canMakePublic = Boolean(user?.account_type === "personal" || user?.is_business_verified);
  const safeLists = normalizeLists(lists);

  useEffect(() => {
    async function loadLists() {
      if (!isReady) {
        return;
      }

      if (!isAuthenticated || !accessToken || !canUseLists) {
        setIsLoading(false);
        return;
      }

      try {
        const nextLists = await listCuratedLists(accessToken);
        const normalizedLists = normalizeLists(nextLists);
        setLists(normalizedLists);
        if (normalizedLists.length > 0) {
          setSelectedListId(String(normalizedLists[0].id));
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load your lists.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadLists();
  }, [accessToken, canUseLists, isAuthenticated, isReady]);

  const matchingLists = safeLists.filter((list) => list.items.some((item) => item.company.id === companyId));
  const alreadyInSelectedList = safeLists.some(
    (list) => String(list.id) === selectedListId && list.items.some((item) => item.company.id === companyId)
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      let targetListId = selectedListId;

      if (isCreatingNewList) {
        const nextList = await createCuratedList(accessToken, {
          title: newListTitle,
          description: newListDescription,
          is_public: canMakePublic,
        });
        setLists((current) => [nextList, ...normalizeLists(current)]);
        targetListId = String(nextList.id);
        setSelectedListId(String(nextList.id));
        setNewListTitle("");
        setNewListDescription("");
        setIsCreatingNewList(false);
      }

      if (!targetListId) {
        throw new Error("Choose a list or create a new one first.");
      }

      const newItem = await addCuratedListItem(accessToken, Number(targetListId), {
        company_id: companyId,
        position: 1,
      });

      setLists((current) =>
        normalizeLists(current).map((list) =>
          list.id === Number(targetListId)
            ? {
                ...list,
                items: [...list.items, newItem],
              }
            : list
        )
      );
      setSuccessMessage("Added to your list.");
      onAdded?.();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to add this business to your list."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!isReady) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="detail-community-action detail-community-secondary">
        <p className="muted">Log in to add this business to one of your FOUND lists.</p>
        <Link className="button button-secondary" href="/login">
          Log in to use lists
        </Link>
      </div>
    );
  }

  if (!canUseLists) {
    return (
      <div className="detail-community-action detail-community-secondary">
        <p className="muted">Lists aren&apos;t available on this account yet.</p>
      </div>
    );
  }

  return (
    <div className="detail-community-action detail-community-secondary">
      <form className="detail-list-form" onSubmit={handleSubmit}>
        <div className="detail-list-form-header">
          {matchingLists.length > 0 ? (
            <div className="filter-chip-row">
              {matchingLists.map((list) => (
                <span className="badge badge-outline" key={list.id}>
                  In {list.title}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {!isCreatingNewList ? (
          <>
            <label className="detail-list-field">
              <select
                aria-label="Choose a list"
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
          </>
        ) : (
          <>
            <label className="detail-list-field">
              <span className="field-label">Create new list</span>
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
            <button
              className="detail-list-switch"
              onClick={() => {
                setIsCreatingNewList(false);
                setError("");
                setSuccessMessage("");
              }}
              type="button"
            >
              Use an existing list
            </button>
            {!canMakePublic ? <p className="detail-list-field-meta">Public lists unlock after verification.</p> : null}
          </>
        )}

        <button
          className="button button-primary"
          disabled={isLoading || isSaving || (!isCreatingNewList && alreadyInSelectedList)}
          type="submit"
        >
          {alreadyInSelectedList && !isCreatingNewList ? "Already saved" : isSaving ? "Saving..." : "Save"}
        </button>
        {!isCreatingNewList ? (
          <button
            className="button button-secondary detail-save-modal-cancel"
            onClick={() => {
              setIsCreatingNewList(true);
              setError("");
              setSuccessMessage("");
            }}
            type="button"
          >
            Create new list
          </button>
        ) : null}
      </form>

      {successMessage ? <p className="contact-form-note is-success">{successMessage}</p> : null}
      {error ? <p className="contact-form-note is-error">{error}</p> : null}
    </div>
  );
}
