"use client";

import Link from "next/link";

import { CuratedList } from "@/types/community";

export function ListManager({
  emptyMessage,
  lists,
  onCreateList,
  enableScroll = false,
  onTogglePublic,
  togglingListIds,
}: {
  emptyMessage: string;
  lists: CuratedList[];
  onCreateList: () => void;
  enableScroll?: boolean;
  onTogglePublic?: (list: CuratedList) => void;
  togglingListIds?: Set<number>;
}) {
  return (
    <div className="list-manager">
      <button className="button button-secondary list-manager-create-button" onClick={onCreateList} type="button">
        CREATE NEW LIST
      </button>

      {lists.length > 0 ? (
        <div
          aria-label="Your lists"
          className={enableScroll ? "list-manager-picker dashboard-scroll-region is-capped" : "list-manager-picker"}
          role="list"
        >
          {lists.map((list) => {
            const isToggling = togglingListIds?.has(list.id);

            return (
              <div className="list-picker-chip-row" key={list.id} role="listitem">
                <Link
                  className="dashboard-row dashboard-row-link dashboard-chip-link list-picker-chip"
                  href={`/lists/${list.id_hash}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="dashboard-chip-label">
                    <strong>{list.title}</strong>
                  </span>
                </Link>
                {onTogglePublic ? (
                  <button
                    className={`list-pill-toggle${list.is_public ? " is-public" : ""}`}
                    type="button"
                    aria-pressed={list.is_public}
                    aria-label={list.is_public ? "Make this list private" : "Make this list public"}
                    disabled={isToggling}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onTogglePublic(list);
                    }}
                  >
                    {isToggling ? "…" : list.is_public ? "Public" : "Private"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="lede">{emptyMessage}</p>
      )}
    </div>
  );
}
