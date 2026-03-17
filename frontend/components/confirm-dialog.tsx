"use client";

import { createPortal } from "react-dom";

export function ConfirmDialog({
  confirmLabel = "confirm",
  isOpen,
  isPending = false,
  message,
  onCancel,
  onConfirm,
  title,
}: {
  confirmLabel?: string;
  isOpen: boolean;
  isPending?: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="detail-save-modal-backdrop detail-confirm-modal-backdrop" onClick={isPending ? undefined : onCancel} role="presentation">
      <div
        aria-describedby="confirm-dialog-message"
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="detail-save-modal detail-confirm-modal"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
      >
        <div className="detail-save-modal-header detail-confirm-modal-header">
          <div className="detail-confirm-modal-copy">
            <span aria-hidden="true" className="detail-confirm-modal-kicker">
              Warning
            </span>
            <span aria-hidden="true" className="detail-confirm-modal-icon">
              !
            </span>
            <strong id="confirm-dialog-title">{title}</strong>
            <p id="confirm-dialog-message">{message}</p>
          </div>
        </div>

        <div className="detail-save-modal-actions detail-confirm-modal-actions">
          <button
            className="button button-secondary detail-save-modal-button detail-save-modal-cancel"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            cancel
          </button>
          <button
            className="button button-primary detail-save-modal-button detail-confirm-modal-danger"
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            {isPending ? `${confirmLabel.toLowerCase()}...` : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
