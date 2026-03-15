"use client";

import Link from "next/link";

import { CuratedList } from "@/types/community";

export function ListManager({
  emptyMessage,
  lists,
  onCreateList,
}: {
  emptyMessage: string;
  lists: CuratedList[];
  onCreateList: () => void;
}) {
  return (
    <div className="list-manager">
      {lists.length > 0 ? (
        <div aria-label="Your lists" className="list-manager-picker" role="list">
          {lists.map((list) => (
            <Link
              className="dashboard-row dashboard-row-link dashboard-chip-link list-picker-chip"
              href={`/lists/${list.id_hash}`}
              key={list.id}
              rel="noreferrer"
              role="listitem"
              target="_blank"
            >
              <span className="dashboard-chip-label">
                <strong>{list.title}</strong>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="lede">{emptyMessage}</p>
      )}

      <button className="button button-secondary list-manager-create-button" onClick={onCreateList} type="button">
        create new list
      </button>
    </div>
  );
}
