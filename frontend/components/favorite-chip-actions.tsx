"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useState } from "react";

import { AddCompanyToList } from "@/components/add-company-to-list";
import type { Favorite } from "@/types/community";

export function FavoriteChipActions({
  favorite,
}: {
  favorite: Favorite;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"menu" | "list">("menu");

  function handleClose() {
    setIsOpen(false);
    setStep("menu");
  }

  return (
    <>
      <button
        className="dashboard-row dashboard-row-link dashboard-chip-link dashboard-chip-button"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span className="dashboard-chip-label">
          <strong>{favorite.company.name}</strong>
          <span>{[favorite.company.city, favorite.company.state].filter(Boolean).join(", ") || "Location pending"}</span>
        </span>
      </button>

      {isOpen
        ? createPortal(
            <div className="detail-save-modal-backdrop" onClick={handleClose} role="presentation">
              <div
                aria-modal="true"
                className="detail-save-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <div className="detail-save-modal-header">
                  <div>
                    <strong>{favorite.company.name}</strong>
                    {step === "menu" ? <p>What do you want to do with this favorite?</p> : <p>Add to list</p>}
                  </div>
                  <button aria-label="Close favorite actions dialog" className="detail-save-close" onClick={handleClose} type="button">
                    x
                  </button>
                </div>

                {step === "menu" ? (
                  <div className="detail-save-modal-form">
                    <div className="detail-save-popover-actions">
                      <Link
                        className="button button-primary detail-save-modal-button"
                        href={`/companies/${favorite.company.slug}`}
                        onClick={handleClose}
                      >
                        open
                      </Link>
                      <button
                        className="button button-secondary detail-save-modal-button detail-save-modal-cancel"
                        onClick={() => setStep("list")}
                        type="button"
                      >
                        add to list
                      </button>
                    </div>
                  </div>
                ) : (
                  <AddCompanyToList
                    companyId={favorite.company.id}
                    onAdded={handleClose}
                  />
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
