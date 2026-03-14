"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { deleteCuratedListItem, updateCuratedList } from "@/lib/api";
import { CuratedList, CuratedListItem } from "@/types/community";

export function EditListModal({
  accessToken,
  isOpen,
  list,
  onClose,
  onUpdated,
  onItemRemoved,
}: {
  accessToken: string | null;
  isOpen: boolean;
  list: CuratedList | null;
  onClose: () => void;
  onUpdated: (list: CuratedList) => void;
  onItemRemoved: (itemId: number) => void;
}) {
  const descriptionLimit = 100;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && list) {
      setTitle(list.title);
      setDescription(list.description);
      setIsPublic(list.is_public);
      setError("");
      setIsSaving(false);
      setRemovingItemId(null);
    }
  }, [isOpen, list]);

  if (!isOpen || !list) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !list) {
      setError("Please log in again before updating this list.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const nextList = await updateCuratedList(accessToken, list.id, {
        title,
        description: description.slice(0, descriptionLimit),
        is_public: isPublic,
      });
      onUpdated(nextList);
      onClose();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update this list.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveItem(item: CuratedListItem) {
    if (!accessToken || !list) {
      setError("Please log in again before updating this list.");
      return;
    }

    const confirmed = window.confirm(`Remove "${item.company.name}" from "${list.title}"?`);
    if (!confirmed) {
      return;
    }

    setRemovingItemId(item.id);
    setError("");

    try {
      await deleteCuratedListItem(accessToken, item.id);
      onItemRemoved(item.id);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove this business from the list.");
    } finally {
      setRemovingItemId(null);
    }
  }

  return createPortal(
    <div className="detail-save-modal-backdrop" onClick={onClose} role="presentation">
      <div aria-modal="true" className="detail-save-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="detail-save-modal-header">
          <div>
            <strong>Edit list</strong>
            <p>Update the title, description, or privacy before you share it.</p>
          </div>
          <button aria-label="Close edit list dialog" className="detail-save-close" onClick={onClose} type="button">
            x
          </button>
        </div>

        <form className="detail-save-modal-form" onSubmit={handleSubmit}>
          <label className="detail-list-field">
            <span className="field-label">List title</span>
            <input onChange={(event) => setTitle(event.target.value)} required value={title} />
          </label>

          <label className="detail-list-field">
            <span className="field-label">Description</span>
            <textarea
              maxLength={descriptionLimit}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              value={description}
            />
            <span className="detail-list-field-meta">{description.length}/{descriptionLimit}</span>
          </label>

          <div className="detail-list-field">
            <span className="field-label">Businesses on this list</span>
            <div className="detail-save-item-list">
              {list.items.length ? (
                list.items.map((item) => {
                  const meta = [item.company.city, item.company.state].filter(Boolean).join(", ");

                  return (
                    <div className="detail-save-item-row" key={item.id}>
                      <div className="detail-save-item-copy">
                        <strong>{item.company.name}</strong>
                        {meta ? <span>{meta}</span> : null}
                      </div>
                      <button
                        className="detail-save-item-remove"
                        disabled={removingItemId === item.id}
                        onClick={() => void handleRemoveItem(item)}
                        type="button"
                      >
                        {removingItemId === item.id ? "removing..." : "remove"}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="detail-save-item-empty">No businesses saved on this list yet.</p>
              )}
            </div>
          </div>

          <label className="detail-save-toggle-row">
            <button
              aria-pressed={isPublic}
              className={isPublic ? "detail-save-toggle is-active" : "detail-save-toggle"}
              onClick={() => setIsPublic((current) => !current)}
              type="button"
            >
              <span className="detail-save-toggle-knob" />
            </button>
            <span className="detail-save-toggle-copy">
              {isPublic ? "you went public!" : "Make this list public"}
            </span>
          </label>

          {error ? <p className="contact-form-note is-error">{error}</p> : null}

          <div className="detail-save-modal-actions">
            <button className="button button-secondary detail-save-modal-button detail-save-modal-cancel" onClick={onClose} type="button">
              cancel
            </button>
            <button className="button button-primary detail-save-modal-button" disabled={isSaving} type="submit">
              {isSaving ? "saving..." : "save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
