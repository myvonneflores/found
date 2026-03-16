"use client";

import { useEffect, useRef, useState } from "react";

type BrandedSelectOption = {
  label: string;
  value: string;
};

export function BrandedSelect({
  name,
  value,
  placeholder,
  options,
  onSelect,
  disabled = false,
}: {
  name: string;
  value: string;
  placeholder: string;
  options: BrandedSelectOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const activeLabel = options.find((option) => option.value === value)?.label ?? placeholder;

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

  function toggleDropdown() {
    if (disabled) {
      return;
    }
    setIsOpen((open) => !open);
  }

  return (
    <div className={`directory-custom-select${isOpen ? " is-open" : ""}`} ref={containerRef}>
      <input name={name} type="hidden" value={value} />
      <button
        aria-expanded={isOpen}
        aria-disabled={disabled}
        className="directory-custom-select-trigger"
        disabled={disabled}
        onClick={toggleDropdown}
        type="button"
      >
        <span>{activeLabel}</span>
        <span className="directory-custom-select-chevron" aria-hidden="true">
          v
        </span>
      </button>
      {isOpen ? (
        <div className="directory-custom-select-menu">
          {options.map((option) => (
            <button
              className={option.value === value ? "directory-custom-select-option is-active" : "directory-custom-select-option"}
              key={option.value || option.label}
              onClick={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
