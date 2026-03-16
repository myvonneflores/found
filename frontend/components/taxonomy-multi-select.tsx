"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TaxonomySelectOption = {
  label: string;
  value: string;
};

const MENU_MAX_ROWS = 8;
const MENU_ROW_HEIGHT_PX = 48;
const MENU_VIEWPORT_PADDING_PX = 16;

export function TaxonomyMultiSelect({
  options,
  placeholder,
  selected,
  onToggle,
  portal,
}: {
  options: TaxonomySelectOption[];
  placeholder: string;
  selected: string[];
  onToggle: (value: string) => void;
  portal?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<
    { top: number; left: number; width: number; maxHeight: number } | null
  >(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedLabels = options.filter((option) => selectedSet.has(option.value)).map((option) => option.label);
  const triggerLabel =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} selected`;

  const updateMenuPosition = useCallback(() => {
    const trigger = containerRef.current?.querySelector<HTMLButtonElement>(".directory-custom-select-trigger");
    const rect = trigger?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const viewportHeight = window.innerHeight;
    const availableBelow = Math.max(viewportHeight - rect.bottom - MENU_VIEWPORT_PADDING_PX, 0);
    const availableAbove = Math.max(rect.top - MENU_VIEWPORT_PADDING_PX, 0);
    const shouldOpenAbove = availableBelow < MENU_ROW_HEIGHT_PX && availableAbove > availableBelow;
    const fallbackMaxHeight = MENU_MAX_ROWS * MENU_ROW_HEIGHT_PX;
    const computedMaxHeight = Math.max(
      Math.min(fallbackMaxHeight, shouldOpenAbove ? availableAbove : availableBelow || fallbackMaxHeight),
      Math.min(MENU_ROW_HEIGHT_PX, fallbackMaxHeight)
    );
    const top = shouldOpenAbove ? rect.top - computedMaxHeight : rect.bottom;

    setMenuPosition({
      top,
      left: rect.left,
      width: rect.width,
      maxHeight: computedMaxHeight,
    });
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();

    const handleResize = () => updateMenuPosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, updateMenuPosition]);

  const shouldUsePortal = portal ?? true;

  return (
    <div className={`directory-custom-select directory-custom-multiselect${isOpen ? " is-open" : ""}`} ref={containerRef}>
      <button
        aria-expanded={isOpen}
        className="directory-custom-select-trigger"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span>{triggerLabel}</span>
        <span aria-hidden="true" className="directory-custom-select-chevron">
          v
        </span>
      </button>
      {isOpen ? (
        <div
          className="directory-custom-select-menu"
          style={
            menuPosition
              ? {
                  ...(shouldUsePortal
                    ? {
                        position: "fixed" as const,
                        top: menuPosition.top,
                        left: menuPosition.left,
                        width: menuPosition.width,
                      }
                    : {}),
                  maxHeight: menuPosition.maxHeight,
                }
              : undefined
          }
        >
          {options.map((option) => {
            const isActive = selectedSet.has(option.value);

            return (
              <button
                className={isActive ? "directory-custom-select-option is-active" : "directory-custom-select-option"}
                key={option.value}
                onClick={() => onToggle(option.value)}
                type="button"
              >
                <span>{option.label}</span>
                <span aria-hidden="true" className="directory-multiselect-check">
                  {isActive ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
