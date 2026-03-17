"use client";

import Link from "next/link";

import type { SavedCuratedList } from "@/types/community";

export function SavedListShelf({
  error,
  isLoading,
  savedLists,
}: {
  error?: string;
  isLoading: boolean;
  savedLists: SavedCuratedList[];
}) {
  return (
    <article className="panel dashboard-panel dashboard-saved-lists-card dashboard-card-full">
      <div className="detail-claimed-header">
        <div className="detail-claimed-copy">
          <h2>Saved lists</h2>
        </div>
      </div>

      {isLoading ? <p className="lede">Loading saved lists...</p> : null}
      {!isLoading && savedLists.length === 0 ? (
        <div className="detail-recommendations-empty">
          <span className="muted">No saved lists yet. Browse public lists to build your reference shelf.</span>
        </div>
      ) : null}

      {savedLists.length > 0 ? (
        <div className="detail-recommendations-pill-grid">
          {savedLists.map((savedList) => (
            <Link
              className="dashboard-row dashboard-row-link dashboard-chip-link dashboard-chip-button detail-recommendation-pill dashboard-saved-list-pill-link"
              href={`/lists/${savedList.list.id_hash}`}
              key={savedList.id}
            >
              <span className="dashboard-chip-label">
                <strong>{savedList.list.title}</strong>
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {error ? <p className="contact-form-note is-error">{error}</p> : null}
    </article>
  );
}
