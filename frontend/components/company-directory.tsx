"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { detailDescription, listDescription } from "@/lib/company-copy";
import { CompanyDetail, CompanyListItem, CompanySearchParams, TaxonomyItem } from "@/types/company";

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

function FilterSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
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

function BrandedSelect({
  name,
  value,
  placeholder,
  options,
  onSelect,
}: {
  name: string;
  value: string;
  placeholder: string;
  options: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
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

  return (
    <div className={`directory-custom-select${isOpen ? " is-open" : ""}`} ref={containerRef}>
      <input name={name} type="hidden" value={value} />
      <button
        aria-expanded={isOpen}
        className="directory-custom-select-trigger"
        onClick={() => setIsOpen((open) => !open)}
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
              key={option.value || "__empty__"}
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

function joinSelectedValues(values: Set<string>) {
  return Array.from(values).join(",");
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
  const selectedLabels = options.filter((option) => selected.has(option.value)).map((option) => option.label);
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
        <span className="directory-custom-select-chevron" aria-hidden="true">
          v
        </span>
      </button>
      {isOpen ? (
        <div className="directory-custom-select-menu">
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

function WebsiteIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeWidth="2.8" />
      <path d="M5.5 16h21" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M16 5.5c3 3.2 4.5 6.7 4.5 10.5S19 23.3 16 26.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M16 5.5c-3 3.2-4.5 6.7-4.5 10.5S13 23.3 16 26.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <rect x="6" y="6" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2.8" />
      <circle cx="16" cy="16" r="4.6" stroke="currentColor" strokeWidth="2.8" />
      <circle cx="22.1" cy="9.9" r="1.4" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path
        d="M18.8 26V17.4h3.1l.7-4.1h-3.8v-2.1c0-1.7.7-2.7 2.8-2.7H23V5c-.9-.1-1.9-.2-3.1-.2-3.4 0-5.6 2.1-5.6 5.9v2.6H11v4.1h3.3V26h4.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <rect x="6" y="6" width="20" height="20" rx="4.5" stroke="currentColor" strokeWidth="2.8" />
      <path d="M11.2 13.4V21" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="11.2" cy="10.5" r="1.5" fill="currentColor" />
      <path d="M16 21v-4.5c0-1.8 1.1-3.1 2.8-3.1 1.6 0 2.5 1.1 2.5 2.9V21" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 13.4V21" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function QuickLinkLogo({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      aria-label={label}
      className="directory-link-logo"
      href={href}
      rel="noreferrer"
      target="_blank"
      title={label}
    >
      <span className="directory-link-logo-mark">{children}</span>
    </a>
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
}: {
  companies: CompanyListItem[];
  selectedCompany: CompanyDetail | null;
  searchParams: CompanySearchParams;
  hasActiveFilters: boolean;
  cities: string[];
  businessCategories: TaxonomyItem[];
  ownershipMarkers: TaxonomyItem[];
  sustainabilityMarkers: TaxonomyItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const filtersPanelRef = useRef<HTMLElement | null>(null);
  const filtersSurfaceRef = useRef<HTMLDivElement | null>(null);
  const detailPanelRef = useRef<HTMLElement | null>(null);
  const detailSurfaceRef = useRef<HTMLDivElement | null>(null);
  const viewportFrameRef = useRef<number | null>(null);
  const heightFrameRef = useRef<number | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.search ?? "");
  const [sidePanelHeight, setSidePanelHeight] = useState<string | undefined>(undefined);
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(undefined);
  const [isResizing, setIsResizing] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(true);
  const [mobileFindsOpen, setMobileFindsOpen] = useState(false);
  const [mobileFindOpen, setMobileFindOpen] = useState(false);
  const selectedOwnership = selectedValues(searchParams.ownership_markers);
  const selectedSustainability = selectedValues(searchParams.sustainability_markers);
  const selectedCity = searchParams.city ?? "";
  const selectedBusinessCategory = searchParams.business_category ?? "";
  const selectedSlug = selectedCompany?.slug ?? searchParams.selected;
  const ownershipNames = selectedCompany ? names(selectedCompany.ownership_markers) : [];
  const sustainabilityNames = selectedCompany ? names(selectedCompany.sustainability_markers) : [];
  const productNames = selectedCompany ? names(selectedCompany.product_categories) : [];
  const focusNames = [
    ...sustainabilityNames,
    ...(selectedCompany?.is_vegan_friendly ? ["Vegan Friendly"] : []),
    ...(selectedCompany?.is_gf_friendly ? ["GF Friendly"] : []),
  ];
  const detailListItems = [...ownershipNames, ...focusNames].map(displayLabel);
  const productSummary = productNames.map(displayLabel);
  const hasDetailListItems = detailListItems.length > 0;
  const hasCompactDetailList = detailListItems.length > 0 && detailListItems.length <= 2;
  const isMobileStack = viewportWidth !== undefined && viewportWidth <= 760;

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
    const nextParams = new URLSearchParams();

    Object.entries({ ...searchParams, ...updates }).forEach(([key, value]) => {
      if (!value || key === "selected") {
        return;
      }
      nextParams.set(key, value);
    });

    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function submitFilters(form: HTMLFormElement) {
    const formData = new FormData(form);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      const normalized = String(value).trim();
      if (!normalized) {
        continue;
      }
      params.append(key, normalized);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilters({ search: searchValue.trim() || undefined });
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

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
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
    const updateViewportWidth = () => {
      setIsResizing(true);
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = window.setTimeout(() => {
        setIsResizing(false);
        resizeTimeoutRef.current = null;
      }, 140);

      if (viewportFrameRef.current !== null) {
        cancelAnimationFrame(viewportFrameRef.current);
      }

      viewportFrameRef.current = window.requestAnimationFrame(() => {
        setViewportWidth(window.innerWidth);
        viewportFrameRef.current = null;
      });
    };

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => {
      window.removeEventListener("resize", updateViewportWidth);
      if (viewportFrameRef.current !== null) {
        cancelAnimationFrame(viewportFrameRef.current);
      }
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

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
    const grid = gridRef.current;
    const filtersPanel = filtersPanelRef.current;
    const filtersSurface = filtersSurfaceRef.current;
    const detailPanel = detailPanelRef.current;
    const detailSurface = detailSurfaceRef.current;
    if (!grid || !filtersPanel || !filtersSurface || !detailPanel || !detailSurface || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateHeight = () => {
      const filtersHeight = Math.ceil(filtersSurface.scrollHeight);

      if (window.innerWidth <= 760) {
        setSidePanelHeight(undefined);
        return;
      }

      if (window.innerWidth <= 1400) {
        setSidePanelHeight(filtersHeight > 0 ? `${filtersHeight}px` : undefined);
        return;
      }

      if (!selectedCompany) {
        setSidePanelHeight(filtersHeight > 0 ? `${filtersHeight}px` : undefined);
        return;
      }

      const detailHeight = Math.ceil(detailSurface.scrollHeight);
      const nextHeight = Math.max(detailHeight, filtersHeight);
      setSidePanelHeight(nextHeight > 0 ? `${nextHeight}px` : undefined);
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
  }, [hasActiveFilters, selectedCompany, searchParams]);

  const directoryGridStyle = {
    "--directory-side-panel-height": sidePanelHeight,
  } as CSSProperties;
  const surfaceHeightStyle =
    sidePanelHeight &&
    viewportWidth !== undefined &&
    viewportWidth > 760
      ? ({ height: sidePanelHeight, maxHeight: sidePanelHeight } as CSSProperties)
      : undefined;
  const detailSurfaceStyle =
    sidePanelHeight && viewportWidth !== undefined && viewportWidth > 1280
      ? ({ minHeight: sidePanelHeight } as CSSProperties)
      : undefined;
  return (
    <section className="directory-experience">
      <div className="directory-shell">
        <div className="directory-brand-strip directory-brand-strip-menu">
          <div aria-hidden="true" className="directory-header-balance" />
          <span>Found</span>
          <div className="directory-header-actions">
            <div className="directory-menu" ref={menuRef}>
              <button
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="directory-menu-trigger"
                onClick={() => setMenuOpen((open) => !open)}
                type="button"
              >
                <span />
                <span />
                <span />
              </button>
              {menuOpen ? (
                <div className="directory-menu-popover" role="menu">
                  <Link className="directory-menu-link" href="/" onClick={() => setMenuOpen(false)} role="menuitem">
                    Home
                  </Link>
                  <Link className="directory-menu-link" href="/about" onClick={() => setMenuOpen(false)} role="menuitem">
                    About
                  </Link>
                  <Link className="directory-menu-link" href="/contact" onClick={() => setMenuOpen(false)} role="menuitem">
                    Contact
                  </Link>
                  <form
                    className="directory-menu-search"
                    onSubmit={(event) => {
                      submitSearch(event);
                      setMenuOpen(false);
                    }}
                    role="search"
                  >
                    <span className="directory-search-helper">Search</span>
                    <input
                      aria-label="Search businesses"
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder="Find local gems"
                      value={searchValue}
                    />
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={isResizing ? "directory-grid is-resizing" : "directory-grid"}
          ref={gridRef}
          style={directoryGridStyle}
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
                onChange={(event) => {
                  const target = event.target as HTMLInputElement | HTMLSelectElement;
                  if (target.name === "search") {
                    return;
                  }
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

                <div className="directory-form-actions">
                  <Link className="button button-secondary" href="/companies">
                    Reset
                  </Link>
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
                  companies.map((company) => (
                    <Link
                      className={selectedSlug === company.slug ? "directory-company-row is-active" : "directory-company-row"}
                      href={buildDirectoryHref(searchParams, company.slug)}
                      key={company.id}
                    >
                      <span className="directory-company-name">{company.name}</span>
                      <span className="directory-company-meta">{listDescription(company)}</span>
                    </Link>
                  ))
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
                <div className="directory-detail-header-grid">
                  <div className="directory-detail-head">
                    <h2>
                      <Link href={buildCompanyProfileHref(searchParams, selectedCompany.slug)}>{selectedCompany.name}</Link>
                    </h2>
                  </div>

                  <div className="directory-socials">
                    {selectedCompany.website ? (
                      <QuickLinkLogo href={selectedCompany.website} label="Website">
                        <WebsiteIcon />
                      </QuickLinkLogo>
                    ) : null}
                    {selectedCompany.linkedin_page ? (
                      <QuickLinkLogo href={selectedCompany.linkedin_page} label="LinkedIn">
                        <LinkedInIcon />
                      </QuickLinkLogo>
                    ) : null}
                    {selectedCompany.facebook_page ? (
                      <QuickLinkLogo href={selectedCompany.facebook_page} label="Facebook">
                        <FacebookIcon />
                      </QuickLinkLogo>
                    ) : null}
                    {selectedCompany.instagram_handle ? (
                      <QuickLinkLogo
                        href={`https://www.instagram.com/${selectedCompany.instagram_handle}`}
                        label="Instagram"
                      >
                        <InstagramIcon />
                      </QuickLinkLogo>
                    ) : null}
                  </div>

                  <div className="directory-detail-address">
                    {selectedCompany.address ? <p>{selectedCompany.address}</p> : null}
                    <p>{locationLabel(selectedCompany)}</p>
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
    </section>
  );
}
