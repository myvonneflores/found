"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TaxonomySelectOption = {
  label: string;
  value: string;
};

export function TaxonomyMultiSelect({
  options,
  placeholder,
  selected,
  onToggle,
}: {
  options: TaxonomySelectOption[];
  placeholder: string;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedLabels = options.filter((option) => selectedSet.has(option.value)).map((option) => option.label);
  const triggerLabel =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} selected`;

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
        <div className="directory-custom-select-menu">
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
