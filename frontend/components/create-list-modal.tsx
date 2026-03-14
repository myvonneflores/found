"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { createCuratedList } from "@/lib/api";
import { CuratedList } from "@/types/community";

export function CreateListModal({
  accessToken,
  isOpen,
  onClose,
  onCreated,
}: {
  accessToken: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (list: CuratedList) => void;
}) {
  const descriptionLimit = 100;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setIsPublic(false);
      setIsSaving(false);
      setError("");
    }
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setError("Please log in again before creating a list.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const nextList = await createCuratedList(accessToken, {
        title,
        description: description.slice(0, descriptionLimit),
        is_public: isPublic,
      });
      onCreated(nextList);
      onClose();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create your list.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="detail-save-modal-backdrop" onClick={onClose} role="presentation">
      <div aria-modal="true" className="detail-save-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="detail-save-modal-header">
          <div>
            <strong>Create a new list</strong>
            <p>Make a new list for a trip, a city, or a vibe. Make it public if you want to share.</p>
          </div>
          <button aria-label="Close create list dialog" className="detail-save-close" onClick={onClose} type="button">
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
