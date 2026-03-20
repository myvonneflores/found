"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  portal = false,
}: {
  name: string;
  value: string;
  placeholder: string;
  options: BrandedSelectOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  portal?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const activeLabel = options.find((option) => option.value === value)?.label ?? placeholder;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
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
    if (!isOpen || !portal) {
      if (!isOpen) {
        setMenuStyle(null);
      }
      return undefined;
    }

    function updateMenuPosition() {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const preferredHeight = Math.min(options.length * 48 + 16, 384);
      const availableBelow = viewportHeight - rect.bottom - 16;
      const availableAbove = rect.top - 16;
      const openUpward = availableBelow < Math.min(preferredHeight, 180) && availableAbove > availableBelow;
      const maxHeight = Math.max(120, Math.min(preferredHeight, openUpward ? availableAbove : availableBelow));
      const unclampedLeft = rect.left;
      const width = rect.width;
      const left = Math.min(Math.max(16, unclampedLeft), Math.max(16, viewportWidth - width - 16));
      const top = openUpward ? Math.max(16, rect.top - maxHeight - 8) : Math.min(rect.bottom + 8, viewportHeight - maxHeight - 16);

      setMenuStyle({
        left,
        top,
        width,
        maxHeight,
      });
    }

    updateMenuPosition();

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, options.length, portal]);

  function toggleDropdown() {
    if (disabled) {
      return;
    }
    setIsOpen((open) => !open);
  }

  const menu = isOpen ? (
    <div
      className={`directory-custom-select-menu${portal ? " directory-custom-select-menu-portal" : ""}`}
      ref={menuRef}
      style={
        portal && menuStyle
          ? {
              left: `${menuStyle.left}px`,
              top: `${menuStyle.top}px`,
              width: `${menuStyle.width}px`,
              maxHeight: `${menuStyle.maxHeight}px`,
            }
          : undefined
      }
    >
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
  ) : null;

  return (
    <div className={`directory-custom-select${isOpen ? " is-open" : ""}`} ref={containerRef}>
      <input name={name} type="hidden" value={value} />
      <button
        aria-expanded={isOpen}
        aria-disabled={disabled}
        className="directory-custom-select-trigger"
        disabled={disabled}
        onClick={toggleDropdown}
        ref={triggerRef}
        type="button"
      >
        <span>{activeLabel}</span>
        <span className="directory-custom-select-chevron" aria-hidden="true">
          v
        </span>
      </button>
      {!portal ? menu : null}
      {portal && menuStyle && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}
