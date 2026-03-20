"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from "react";

import { CompanySocialLinks } from "@/components/company-social-links";
import { detailDescription, listDescription } from "@/lib/company-copy";
import { useAuth } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import { BrandedSelect } from "@/components/branded-select";
import { AddCompanyToList } from "@/components/add-company-to-list";
import { createFavorite, deleteFavorite, listFavorites } from "@/lib/api";
import { DIRECTORY_FILTER_STORAGE_KEY } from "@/lib/directory-session";
import { CompanyDetail, CompanyListItem, CompanySearchParams, TaxonomyItem } from "@/types/company";

const MOBILE_STACK_BREAKPOINT = 760;
const DETAIL_HEIGHT_SYNC_BREAKPOINT = 1000;
const MENU_MAX_ROWS = 8;
const MENU_ROW_HEIGHT_PX = 48;
const MENU_VIEWPORT_PADDING_PX = 16;

function selectedValues(value?: string) {
  return new Set((value ?? "").split(",").filter(Boolean));
}

function buildDirectoryHref(searchParams: CompanySearchParams, selectedSlug?: string) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value && key !== "selected") {
      params.set(key, value);
    }
  });
  if (selectedSlug) {
    params.set("selected", selectedSlug);
  }
  const query = params.toString();
  return query ? `/companies?${query}` : "/companies";
}

function buildCompanyProfileHref(searchParams: CompanySearchParams, slug: string) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value && key !== "selected") {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `/companies/${slug}?${query}` : `/companies/${slug}`;
}

function locationLabel(company: { city: string; state: string; country: string }) {
  return [company.city, company.state, company.country].filter(Boolean).join(", ");
}

function names(items: TaxonomyItem[]) {
  return items.map((item) => item.name);
}

function displayLabel(value: string) {
  const labels: Record<string, string> = {
    "Carries Locally Made Goods": "Locally Made Goods",
    "Focused on Sustainable Products and/or Services": "Sustainable Products",
    "Independent Designers and/or Makers": "Independent Designers and Makers",
  };

  return labels[value] ?? value;
}

function serializeParams(params: CompanySearchParams) {
  const serialized = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value || key === "selected") {
      return;
    }
    serialized.set(key, value);
  });
  return serialized.toString();
}

function loadSavedFilters() {
  try {
    const stored = localStorage.getItem(DIRECTORY_FILTER_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return Object.fromEntries(new URLSearchParams(stored)) as CompanySearchParams;
  } catch {
    return null;
  }
}

function saveFilters(params: CompanySearchParams) {
  if (typeof window === "undefined") {
    return;
  }
  const serialized = serializeParams(params);
  if (serialized) {
    localStorage.setItem(DIRECTORY_FILTER_STORAGE_KEY, serialized);
  } else {
    localStorage.removeItem(DIRECTORY_FILTER_STORAGE_KEY);
  }
}

function clearSavedFilters() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(DIRECTORY_FILTER_STORAGE_KEY);
}

function FilterSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className="directory-filter-section">
      <h3>{title}</h3>
      <div className={className ?? "directory-filter-list"}>{children}</div>
    </section>
  );
}

function MobilePanelToggle({
  label,
  isOpen,
  isCollapsible,
  onToggle,
}: {
  label: string;
  isOpen: boolean;
  isCollapsible: boolean;
  onToggle: () => void;
}) {
  if (!isCollapsible) {
    return <div className="directory-panel-mobile-title">{label}</div>;
  }

  return (
    <button
      aria-expanded={isOpen}
      className="directory-panel-mobile-title directory-panel-mobile-toggle"
      onClick={onToggle}
      type="button"
    >
      <span>{label}</span>
      <span aria-hidden="true" className={isOpen ? "directory-panel-mobile-chevron is-open" : "directory-panel-mobile-chevron"}>
        +
      </span>
    </button>
  );
}


function joinSelectedValues(values: Set<string>) {
  return Array.from(values).join(",");
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M12 21s-6-4.35-9-9.05C2.03 8.23 2 5.68 3.68 4.15 5.36 2.65 8.04 2.8 9.6 4.32L12 6.69l2.4-2.37c1.56-1.52 4.24-1.67 5.92-0.17 1.68 1.53 1.65 4.08-0.32 7.74C18 16.65 12 21 12 21z"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

function BrandedMultiSelect({
  placeholder,
  options,
  selected,
  onToggle,
}: {
  placeholder: string;
  options: Array<{ label: string; value: string }>;
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<
    { top: number; left: number; width: number; maxHeight: number } | null
  >(null);
  const selectedLabels = options.filter((option) => selected.has(option.value)).map((option) => option.label);
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

  return (
    <div className={`directory-custom-select directory-custom-multiselect${isOpen ? " is-open" : ""}`} ref={containerRef}>
      <button
        aria-expanded={isOpen}
        className="directory-custom-select-trigger"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span>{triggerLabel}</span>
        <span className="directory-custom-select-chevron" aria-hidden="true">
          v
        </span>
      </button>
      {isOpen ? (
        <div
          className="directory-custom-select-menu"
          style={
            menuPosition
              ? {
                  position: "fixed",
                  top: menuPosition.top,
                  left: menuPosition.left,
                  width: menuPosition.width,
                  maxHeight: menuPosition.maxHeight,
                }
              : undefined
          }
        >
          {options.map((option) => {
            const isActive = selected.has(option.value);
            return (
              <button
                className={isActive ? "directory-custom-select-option is-active" : "directory-custom-select-option"}
                key={option.value}
                onClick={() => onToggle(option.value)}
                type="button"
              >
                <span>{option.label}</span>
                <span className="directory-multiselect-check" aria-hidden="true">
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

export function CompanyDirectory({
  companies,
  selectedCompany,
  searchParams,
  hasActiveFilters,
  cities,
  businessCategories,
  ownershipMarkers,
  sustainabilityMarkers,
  brandHref = "/companies",
}: {
  companies: CompanyListItem[];
  selectedCompany: CompanyDetail | null;
  searchParams: CompanySearchParams;
  hasActiveFilters: boolean;
  cities: string[];
  businessCategories: TaxonomyItem[];
  ownershipMarkers: TaxonomyItem[];
  sustainabilityMarkers: TaxonomyItem[];
  brandHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { getValidAccessToken, isAuthenticated, isReady } = useAuth();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const filtersPanelRef = useRef<HTMLElement | null>(null);
  const filtersSurfaceRef = useRef<HTMLDivElement | null>(null);
  const filtersFormRef = useRef<HTMLFormElement | null>(null);
  const detailPanelRef = useRef<HTMLElement | null>(null);
  const detailSurfaceRef = useRef<HTMLDivElement | null>(null);
  const favoritePromptAnchorRef = useRef<HTMLButtonElement | null>(null);
  const viewportFrameRef = useRef<number | null>(null);
  const heightFrameRef = useRef<number | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);
  const sidePanelHeightRef = useRef<string | undefined>(undefined);
  const previousSelectedSlugRef = useRef<string | undefined>(searchParams.selected);
  const [searchValue, setSearchValue] = useState(searchParams.search ?? "");
  const [sidePanelHeight, setSidePanelHeight] = useState<string | undefined>(undefined);
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(undefined);
  const [isResizing, setIsResizing] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(true);
  const [mobileFindsOpen, setMobileFindsOpen] = useState(false);
  const [mobileFindOpen, setMobileFindOpen] = useState(false);
  const selectedOwnership = selectedValues(searchParams.ownership_markers);
  const selectedSustainability = selectedValues(searchParams.sustainability_markers);
  const selectedCity = searchParams.city ?? "";
  const selectedBusinessCategory = searchParams.business_category ?? "";
  const selectedSlug = selectedCompany?.slug ?? searchParams.selected;
  const [favoriteMap, setFavoriteMap] = useState<Record<number, number>>({});
  const [togglingFavorites, setTogglingFavorites] = useState<Set<number>>(new Set());
  const [favoritePromptCompanyId, setFavoritePromptCompanyId] = useState<number | null>(null);
  const [favoritePromptPosition, setFavoritePromptPosition] = useState({ top: 96, left: 16 });
  const [listPromptCompanyId, setListPromptCompanyId] = useState<number | null>(null);
  const closeListPrompt = () => setListPromptCompanyId(null);
  const closeFavoritePrompt = () => setFavoritePromptCompanyId(null);
  const ownershipNames = selectedCompany ? names(selectedCompany.ownership_markers) : [];
  const sustainabilityNames = selectedCompany ? names(selectedCompany.sustainability_markers) : [];
  const productNames = selectedCompany ? names(selectedCompany.product_categories) : [];
  const focusNames = sustainabilityNames;
  const detailListItems = [...ownershipNames, ...focusNames].map(displayLabel);
  const productSummary = productNames.map(displayLabel);
  const hasDetailListItems = detailListItems.length > 0;
  const hasCompactDetailList = detailListItems.length > 0 && detailListItems.length <= 2;
  const isMobileStack = viewportWidth !== undefined && viewportWidth <= MOBILE_STACK_BREAKPOINT;
  const headerResetKey = JSON.stringify(searchParams);
  useEffect(() => {
    setSearchValue(searchParams.search ?? "");
  }, [searchParams.search]);
  const favoritePrompt =
    favoritePromptCompanyId && typeof document !== "undefined"
      ? createPortal(
          <div
            className="detail-save-popover detail-save-popover-floating"
            role="status"
            style={{
              left: `${favoritePromptPosition.left}px`,
              top: `${favoritePromptPosition.top}px`,
            }}
          >
            <p>Added to favorites! Wanna add it to a list too?</p>
            <div className="detail-save-popover-actions">
              <button
                className="button button-primary"
                onClick={() => {
                  setListPromptCompanyId(favoritePromptCompanyId);
                  closeFavoritePrompt();
                }}
                type="button"
              >
                yes please
              </button>
              <button className="button button-secondary" onClick={closeFavoritePrompt} type="button">
                maybe later
              </button>
            </div>
          </div>,
          document.body
        )
      : null;
  const listPromptModal =
    listPromptCompanyId && typeof document !== "undefined"
      ? createPortal(
          <div className="detail-save-modal-backdrop" onClick={closeListPrompt} role="presentation">
            <div
              aria-modal="true"
              className="detail-save-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <div className="detail-save-modal-header">
                <div>
                  <strong>Add to a list</strong>
                  <p>Pick an existing list or create a new one.</p>
                </div>
                <button
                  aria-label="Close add to list dialog"
                  className="detail-save-close"
                  onClick={closeListPrompt}
                  type="button"
                >
                  x
                </button>
              </div>
              <AddCompanyToList companyId={listPromptCompanyId} onAdded={closeListPrompt} />
            </div>
          </div>,
          document.body
        )
      : null;

  useEffect(() => {
    if (!favoritePromptCompanyId) {
      return undefined;
    }

    function updateFavoritePromptPosition() {
      const trigger = favoritePromptAnchorRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const promptWidth = Math.min(336, window.innerWidth - 32);
      const left = Math.min(
        Math.max(16, rect.right - promptWidth),
        Math.max(16, window.innerWidth - promptWidth - 16)
      );
      const top = Math.min(rect.bottom + 12, window.innerHeight - 180);

      setFavoritePromptPosition({ top, left });
    }

    updateFavoritePromptPosition();
    window.addEventListener("resize", updateFavoritePromptPosition);
    window.addEventListener("scroll", updateFavoritePromptPosition, true);

    return () => {
      window.removeEventListener("resize", updateFavoritePromptPosition);
      window.removeEventListener("scroll", updateFavoritePromptPosition, true);
    };
  }, [favoritePromptCompanyId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (hasActiveFilters) {
      saveFilters(searchParams);
      return;
    }

    const saved = loadSavedFilters();
    if (!saved) {
      return;
    }

    const current = serializeParams(searchParams);
    const stored = serializeParams(saved);
    if (!stored || current === stored) {
      return;
    }

    router.replace(stored ? `/companies?${stored}` : pathname);
  }, [hasActiveFilters, pathname, router, searchParams]);
  useEffect(() => {
    if (!isReady) {
      return;
    }

    let isMounted = true;

    async function loadFavorites() {
      if (!isAuthenticated) {
        setFavoriteMap({});
        return;
      }

      const token = await getValidAccessToken();
      if (!token) {
        setFavoriteMap({});
        return;
      }

      try {
        const favorites = await listFavorites(token);
        if (!isMounted) {
          return;
        }

        const map: Record<number, number> = {};
        favorites.forEach((favorite) => {
          map[favorite.company.id] = favorite.id;
        });
        setFavoriteMap(map);
      } catch {
        if (isMounted) {
          setFavoriteMap({});
        }
      }
    }

    void loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, isAuthenticated, isReady]);

  const focusOptions = [
    ...sustainabilityMarkers.map((marker) => ({
      label: displayLabel(marker.name),
      value: marker.name,
    })),
    { label: "Vegan Friendly", value: "__vegan__" },
    { label: "GF Friendly", value: "__gf__" },
  ];
  const selectedFocus = new Set(selectedSustainability);
  if (searchParams.is_vegan_friendly === "true") {
    selectedFocus.add("__vegan__");
  }
  if (searchParams.is_gf_friendly === "true") {
    selectedFocus.add("__gf__");
  }

  function updateFilters(updates: Partial<CompanySearchParams>) {
    const nextSearchParams = {
      ...searchParams,
      ...updates,
    };
    const nextParams = new URLSearchParams();

    Object.entries(nextSearchParams).forEach(([key, value]) => {
      if (!value || key === "selected") {
        return;
      }
      nextParams.set(key, value);
    });

    const query = nextParams.toString();
    saveFilters(nextSearchParams);
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function submitFilters(form: HTMLFormElement) {
    const formData = new FormData(form);
    const params = new URLSearchParams();
    const nextSearchParams: CompanySearchParams = {};

    for (const [key, value] of formData.entries()) {
      const normalized = String(value).trim();
      if (!normalized) {
        continue;
      }
      params.append(key, normalized);
      nextSearchParams[key as keyof CompanySearchParams] = normalized;
    }

    saveFilters(nextSearchParams);

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleResetFilters() {
    clearSavedFilters();
    setSearchValue("");
    router.push(pathname);
  }

  function toggleOwnershipMarker(value: string) {
    const nextSelected = new Set(selectedOwnership);
    if (nextSelected.has(value)) {
      nextSelected.delete(value);
    } else {
      nextSelected.add(value);
    }
    updateFilters({
      ownership_markers: nextSelected.size ? joinSelectedValues(nextSelected) : undefined,
    });
  }

  function toggleFocusValue(value: string) {
    const nextSustainability = new Set(selectedSustainability);
    let nextVegan = searchParams.is_vegan_friendly === "true";
    let nextGf = searchParams.is_gf_friendly === "true";

    if (value === "__vegan__") {
      nextVegan = !nextVegan;
    } else if (value === "__gf__") {
      nextGf = !nextGf;
    } else if (nextSustainability.has(value)) {
      nextSustainability.delete(value);
    } else {
      nextSustainability.add(value);
    }

    updateFilters({
      sustainability_markers: nextSustainability.size ? joinSelectedValues(nextSustainability) : undefined,
      is_vegan_friendly: nextVegan ? "true" : undefined,
      is_gf_friendly: nextGf ? "true" : undefined,
    });
  }

  async function handleFavoriteClick(event: ReactMouseEvent<HTMLButtonElement>, company: Pick<CompanyListItem, "id" | "slug">) {
    event.preventDefault();
    event.stopPropagation();
    favoritePromptAnchorRef.current = event.currentTarget;

    if (!isAuthenticated) {
      const nextHref = buildDirectoryHref(searchParams, company.slug);
      router.push(`/login?next=${encodeURIComponent(nextHref)}`);
      return;
    }

    if (togglingFavorites.has(company.id)) {
      return;
    }

    const token = await getValidAccessToken();
    if (!token) {
      const nextHref = buildDirectoryHref(searchParams, company.slug);
      router.push(`/login?next=${encodeURIComponent(nextHref)}`);
      return;
    }

    setTogglingFavorites((current) => {
      const next = new Set(current);
      next.add(company.id);
      return next;
    });

    try {
      const favoriteId = favoriteMap[company.id];
      if (favoriteId) {
        await deleteFavorite(token, favoriteId);
        closeFavoritePrompt();
        closeListPrompt();
        setFavoriteMap((current) => {
          const next = { ...current };
          delete next[company.id];
          return next;
        });
      } else {
        const favorite = await createFavorite(token, company.id);
        setFavoriteMap((current) => ({ ...current, [company.id]: favorite.id }));
        setFavoritePromptCompanyId(company.id);
      }
    } catch {
      // swallow errors
    } finally {
      setTogglingFavorites((current) => {
        const next = new Set(current);
        next.delete(company.id);
        return next;
      });
    }
  }

  useEffect(() => {
    const syncViewportWidth = () => {
      if (viewportFrameRef.current !== null) {
        cancelAnimationFrame(viewportFrameRef.current);
      }

      viewportFrameRef.current = window.requestAnimationFrame(() => {
        setViewportWidth(window.innerWidth);
        viewportFrameRef.current = null;
      });
    };

    const handleResize = () => {
      setIsResizing(true);
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = window.setTimeout(() => {
        setIsResizing(false);
        resizeTimeoutRef.current = null;
      }, 140);

      syncViewportWidth();
    };

    syncViewportWidth();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (viewportFrameRef.current !== null) {
        cancelAnimationFrame(viewportFrameRef.current);
      }
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (viewportWidth === undefined) {
      return;
    }

    setLayoutReady(false);

    let firstFrame = window.requestAnimationFrame(() => {
      firstFrame = window.requestAnimationFrame(() => {
        setLayoutReady(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
    };
  }, [viewportWidth, selectedSlug]);

  useEffect(() => {
    if (!isMobileStack) {
      return;
    }

    if (!hasActiveFilters) {
      setMobileFiltersOpen(true);
      setMobileFindsOpen(false);
      setMobileFindOpen(false);
      return;
    }

    setMobileFindsOpen(true);
    if (selectedCompany) {
      setMobileFindOpen(true);
    }
  }, [hasActiveFilters, isMobileStack, selectedCompany]);

  useEffect(() => {
    const previousSelectedSlug = previousSelectedSlugRef.current;
    previousSelectedSlugRef.current = selectedSlug;

    if (!isMobileStack || !selectedCompany || !selectedSlug || previousSelectedSlug === selectedSlug) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isMobileStack, selectedCompany, selectedSlug]);

  useEffect(() => {
    const grid = gridRef.current;
    const filtersPanel = filtersPanelRef.current;
    const filtersSurface = filtersSurfaceRef.current;
    const filtersForm = filtersFormRef.current;
    const detailPanel = detailPanelRef.current;
    const detailSurface = detailSurfaceRef.current;
    if (
      !grid ||
      !filtersPanel ||
      !filtersSurface ||
      !filtersForm ||
      !detailPanel ||
      !detailSurface ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }

    const updateHeight = () => {
      const viewport = viewportWidth ?? window.innerWidth;
      const filtersSurfaceStyles = window.getComputedStyle(filtersSurface);
      const filtersVerticalPadding =
        Number.parseFloat(filtersSurfaceStyles.paddingTop) + Number.parseFloat(filtersSurfaceStyles.paddingBottom);
      const filtersHeight = Math.ceil(filtersForm.scrollHeight + filtersVerticalPadding);
      let nextHeight: string | undefined;

      if (viewport <= MOBILE_STACK_BREAKPOINT) {
        nextHeight = undefined;
      } else if (viewport <= DETAIL_HEIGHT_SYNC_BREAKPOINT || !selectedCompany) {
        nextHeight = filtersHeight > 0 ? `${filtersHeight}px` : undefined;
      } else {
        const detailHeight = Math.ceil(detailSurface.scrollHeight);
        nextHeight = Math.max(detailHeight, filtersHeight) > 0 ? `${Math.max(detailHeight, filtersHeight)}px` : undefined;
      }

      if (sidePanelHeightRef.current !== nextHeight) {
        sidePanelHeightRef.current = nextHeight;
        setSidePanelHeight(nextHeight);
      }
    };

    const scheduleHeightUpdate = () => {
      if (heightFrameRef.current !== null) {
        cancelAnimationFrame(heightFrameRef.current);
      }

      heightFrameRef.current = window.requestAnimationFrame(() => {
        updateHeight();
        heightFrameRef.current = null;
      });
    };

    scheduleHeightUpdate();

    const observer = new ResizeObserver(() => {
      scheduleHeightUpdate();
    });

    observer.observe(grid);
    observer.observe(filtersPanel);
    observer.observe(filtersSurface);
    observer.observe(filtersForm);
    observer.observe(detailPanel);
    observer.observe(detailSurface);
    window.addEventListener("resize", scheduleHeightUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleHeightUpdate);
      if (heightFrameRef.current !== null) {
        cancelAnimationFrame(heightFrameRef.current);
      }
    };
  }, [hasActiveFilters, selectedCompany, searchParams, viewportWidth]);

  const surfaceHeightStyle =
    sidePanelHeight &&
    viewportWidth !== undefined &&
    viewportWidth > MOBILE_STACK_BREAKPOINT
      ? ({ height: sidePanelHeight, maxHeight: sidePanelHeight } as CSSProperties)
      : undefined;
  const detailSurfaceStyle =
    sidePanelHeight && viewportWidth !== undefined && viewportWidth > DETAIL_HEIGHT_SYNC_BREAKPOINT
      ? ({ minHeight: sidePanelHeight } as CSSProperties)
      : undefined;
  return (
    <section className="directory-experience">
      <div className="directory-shell">
        <SiteHeader brandHref={brandHref} resetKey={headerResetKey} />

        <div
          className={
            isResizing
              ? "directory-grid is-resizing"
              : !layoutReady
                ? "directory-grid is-initializing"
                : "directory-grid"
          }
          ref={gridRef}
        >
          <aside className="directory-panel directory-panel-filters" ref={filtersPanelRef}>
            <MobilePanelToggle
              isOpen={!isMobileStack || mobileFiltersOpen}
              isCollapsible={isMobileStack}
              label="filters"
              onToggle={() => setMobileFiltersOpen((open) => !open)}
            />
            <div className="directory-panel-surface" ref={filtersSurfaceRef} style={surfaceHeightStyle}>
              <form
                action="/companies"
                className={
                  !isMobileStack || mobileFiltersOpen
                    ? "directory-form"
                    : "directory-form directory-mobile-collapsed"
                }
                method="get"
                ref={filtersFormRef}
                onChange={(event) => {
                  const target = event.target as HTMLInputElement | HTMLSelectElement;
                  submitFilters(event.currentTarget);
                }}
                onSubmit={(event) => {
                  event.preventDefault();
                  submitFilters(event.currentTarget);
                }}
              >
                <FilterSection title="City">
                  <BrandedSelect
                    name="city"
                    onSelect={(value) => updateFilters({ city: value || undefined })}
                    options={[
                      { label: "Anywhere", value: "" },
                      ...cities.map((city) => ({ label: city, value: city })),
                    ]}
                    placeholder="Anywhere"
                    value={selectedCity}
                  />
                </FilterSection>

                <FilterSection title="Category">
                  <BrandedSelect
                    name="business_category"
                    onSelect={(value) => updateFilters({ business_category: value || undefined })}
                    options={[
                      { label: "All", value: "" },
                      ...businessCategories.map((category) => ({
                        label: category.name,
                        value: category.name,
                      })),
                    ]}
                    placeholder="All"
                    value={selectedBusinessCategory}
                  />
                </FilterSection>

                <FilterSection title="Owned By">
                  <BrandedMultiSelect
                    onToggle={toggleOwnershipMarker}
                    options={ownershipMarkers.map((marker) => ({
                      label: displayLabel(marker.name),
                      value: marker.name,
                    }))}
                    placeholder="All"
                    selected={selectedOwnership}
                  />
                </FilterSection>

                <FilterSection title="Features">
                  <BrandedMultiSelect
                    onToggle={toggleFocusValue}
                    options={focusOptions}
                    placeholder="All"
                    selected={selectedFocus}
                  />
                </FilterSection>

                <FilterSection title="Search">
                  <div className="directory-panel-search">
                    <input
                      id="directory-search-input"
                      autoComplete="off"
                      name="search"
                      aria-label="Search businesses"
                      placeholder=""
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                    />
                  </div>
                </FilterSection>

                <div className="directory-form-actions">
                  <button className="button button-secondary" onClick={handleResetFilters} type="button">
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </aside>

          <section className="directory-panel directory-panel-list">
            <MobilePanelToggle
              isOpen={!isMobileStack || mobileFindsOpen}
              isCollapsible={isMobileStack}
              label="finds"
              onToggle={() => setMobileFindsOpen((open) => !open)}
            />
            <div className="directory-panel-surface" style={surfaceHeightStyle}>
              <div
                className={
                  !isMobileStack || mobileFindsOpen
                    ? "directory-company-list"
                    : "directory-company-list directory-mobile-collapsed"
                }
              >
                {companies.length ? (
                  companies.map((company) => {
                    const description = listDescription(company);
                    const isActiveRow = selectedSlug === company.slug;

                    return (
                      <div
                        className={isActiveRow ? "directory-company-row is-active" : "directory-company-row"}
                        key={company.id}
                      >
                        <Link
                          className="directory-company-link"
                          href={buildDirectoryHref(searchParams, company.slug)}
                          scroll={false}
                        >
                          <span className="directory-company-name">{company.name}</span>
                          {description ? <span className="directory-company-meta">{description}</span> : null}
                        </Link>
                        <button
                          className={`directory-company-favorite${favoriteMap[company.id] ? " is-active" : ""}`}
                          type="button"
                          aria-pressed={Boolean(favoriteMap[company.id])}
                          aria-label={favoriteMap[company.id] ? "Remove from favorites" : "Save to favorites"}
                          disabled={togglingFavorites.has(company.id)}
                          onClick={(event) => handleFavoriteClick(event, company)}
                        >
                          <HeartIcon filled={Boolean(favoriteMap[company.id])} />
                        </button>
                      </div>
                    );
                  })
                ) : hasActiveFilters ? (
                  <div className="empty-state">
                    <h2 className="section-title">No matches</h2>
                    <p className="lede">Try broadening the city, category, or ownership filters.</p>
                  </div>
                ) : (
                  <div className="empty-state">
                    <h2 className="section-title">Start with filters</h2>
                    <p className="lede">Choose a city, category, or feature to populate this list.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            className={hasDetailListItems ? "directory-panel directory-panel-detail" : "directory-panel directory-panel-detail is-media-only"}
            ref={detailPanelRef}
          >
            <MobilePanelToggle
              isOpen={!isMobileStack || mobileFindOpen}
              isCollapsible={isMobileStack}
              label="find"
              onToggle={() => setMobileFindOpen((open) => !open)}
            />
            <div className="directory-panel-surface" ref={detailSurfaceRef} style={detailSurfaceStyle}>
              {!isMobileStack || mobileFindOpen ? (
                selectedCompany ? (
                <div className="directory-detail-body">
                  <div className="directory-detail-header-grid directory-search-detail-header">
                    <div className="directory-detail-head directory-search-detail-head">
                      <div className="directory-search-detail-copy">
                        <div className="directory-detail-title">
                          <h2>
                            <Link href={buildCompanyProfileHref(searchParams, selectedCompany.slug)}>{selectedCompany.name}</Link>
                          </h2>
                          <button
                            className={`directory-company-favorite directory-detail-favorite${favoriteMap[selectedCompany.id] ? " is-active" : ""}`}
                            type="button"
                            aria-pressed={Boolean(favoriteMap[selectedCompany.id])}
                            aria-label={favoriteMap[selectedCompany.id] ? "Remove from favorites" : "Save to favorites"}
                            disabled={togglingFavorites.has(selectedCompany.id)}
                            onClick={(event) => handleFavoriteClick(event, selectedCompany)}
                          >
                            <HeartIcon filled={Boolean(favoriteMap[selectedCompany.id])} />
                          </button>
                        </div>

                        <div className="directory-detail-address directory-search-detail-address">
                          {selectedCompany.address ? <p>{selectedCompany.address}</p> : null}
                          <p>{locationLabel(selectedCompany)}</p>
                        </div>
                      </div>

                      <CompanySocialLinks
                        className="directory-socials directory-detail-socials-inline"
                        facebookPage={selectedCompany.facebook_page}
                        instagramHandle={selectedCompany.instagram_handle}
                        linkedinPage={selectedCompany.linkedin_page}
                        website={selectedCompany.website}
                      />
                    </div>
                  </div>

                <div
                  className={
                    hasDetailListItems
                      ? hasCompactDetailList
                        ? "directory-detail-layout is-compact-copy"
                        : "directory-detail-layout"
                      : "directory-detail-layout is-media-only"
                  }
                >
                  {hasDetailListItems ? (
                    <div className="directory-detail-copy">
                      <ul className="directory-detail-list">
                        {detailListItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="directory-detail-media">
                    {selectedCompany.address || selectedCompany.city || selectedCompany.state ? (
                      <div className="directory-detail-map">
                        <iframe
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps?q=${encodeURIComponent(
                            [
                              selectedCompany.address,
                              selectedCompany.city,
                              selectedCompany.state,
                              selectedCompany.zip_code,
                              selectedCompany.country,
                            ]
                              .filter(Boolean)
                              .join(", "),
                          )}&output=embed`}
                          title={`Map for ${selectedCompany.name}`}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {productSummary.length ? (
                  <div className="directory-detail-products">
                    {productSummary.map((item) => (
                      <span className="badge-outline" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
                </div>
              ) : hasActiveFilters ? (
                <div className="empty-state">
                  <h2 className="section-title">No business selected</h2>
                  <p className="lede">Choose a business from the list to explore it here.</p>
                </div>
              ) : (
                <div className="empty-state">
                  <h2 className="section-title">Find a business</h2>
                  <p className="lede">Set filters to load matching businesses and view their details here.</p>
                </div>
              )
              ) : null}
            </div>
          </section>
        </div>
      </div>
      {favoritePrompt}
      {listPromptModal}
    </section>
  );
}
