"use client";

import { createPortal } from "react-dom";

import type { ManagedBusinessLocation } from "@/types/company";

export function BusinessLocationPickerModal({
  isOpen,
  locations,
  onClose,
  onEditAll,
  onSelectLocation,
}: {
  isOpen: boolean;
  locations: ManagedBusinessLocation[];
  onClose: () => void;
  onEditAll: () => void;
  onSelectLocation: (location: ManagedBusinessLocation) => void;
}) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="detail-save-modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-describedby="business-location-picker-message"
        aria-labelledby="business-location-picker-title"
        aria-modal="true"
        className="detail-save-modal dashboard-location-picker-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="detail-save-modal-header">
          <div className="dashboard-location-picker-copy">
            <strong id="business-location-picker-title">Choose a location to edit</strong>
            <p id="business-location-picker-message">
              Open one storefront in edit mode, or edit shared business details across every location.
            </p>
          </div>
          <button aria-label="Close location picker" className="detail-save-close" onClick={onClose} type="button">
            x
          </button>
        </div>

        <div className="dashboard-location-picker-list">
          <button className="dashboard-location-picker-option dashboard-location-picker-option-all" onClick={onEditAll} type="button">
            <span className="dashboard-location-picker-option-copy">
              <strong>Edit all locations</strong>
              <span>Open the shared editor and keep each address untouched.</span>
            </span>
            <span aria-hidden="true" className="dashboard-location-picker-option-arrow">All</span>
          </button>

          {locations.map((location) => (
            <button
              className="dashboard-location-picker-option"
              key={location.slug}
              onClick={() => onSelectLocation(location)}
              type="button"
            >
              <span className="dashboard-location-picker-option-copy">
                <strong>{location.name}</strong>
                <span>{location.address || "Address coming soon"}</span>
                <span>{[location.city, location.state].filter(Boolean).join(", ") || "Location details coming soon"}</span>
              </span>
              <span aria-hidden="true" className="dashboard-location-picker-option-arrow">Edit</span>
            </button>
          ))}
        </div>

        <div className="detail-save-modal-actions">
          <button className="button button-secondary detail-save-modal-button detail-save-modal-cancel" onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
