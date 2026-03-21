"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { BusinessHoursEditor } from "@/components/business-hours-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { clearAuthSession, readAuthSession, writeAuthSession } from "@/lib/auth-storage";
import { TaxonomyMultiSelect } from "@/components/taxonomy-multi-select";
import {
  getManagedBusinessLocation,
  listBusinessCategories,
  listCuisineTypes,
  listOwnershipMarkers,
  listProductCategories,
  refreshAccessToken,
  listSustainabilityMarkers,
  updateManagedBusinessLocation,
} from "@/lib/api";
import type { CompanyDetail, ManagedBusinessProfile, TaxonomyItem } from "@/types/company";

type TaxonomyState = {
  businessCategories: TaxonomyItem[];
  productCategories: TaxonomyItem[];
  cuisineTypes: TaxonomyItem[];
  ownershipMarkers: TaxonomyItem[];
  sustainabilityMarkers: TaxonomyItem[];
};

const EMPTY_TAXONOMIES: TaxonomyState = {
  businessCategories: [],
  productCategories: [],
  cuisineTypes: [],
  ownershipMarkers: [],
  sustainabilityMarkers: [],
};
const UNSAVED_CHANGES_WARNING = "You have unsaved changes to this business profile. Leave without saving?";

type PendingLeaveAction =
  | { type: "close-editor" }
  | { type: "navigate"; href: string };

function toggleId(current: number[], nextId: number) {
  return current.includes(nextId) ? current.filter((value) => value !== nextId) : [...current, nextId];
}

function serializeManagedBusinessProfile(profile: ManagedBusinessProfile) {
  return JSON.stringify(profile);
}

function isTokenError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("token") &&
    (normalized.includes("not valid") || normalized.includes("invalid") || normalized.includes("expired"))
  );
}

export function CompanyOwnerEditor({
  autoApplySharedEdits = false,
  company,
  autoEdit = false,
}: {
  autoApplySharedEdits?: boolean;
  company: CompanyDetail;
  autoEdit?: boolean;
}) {
  const router = useRouter();
  const { accessToken, getValidAccessToken, isAuthenticated, isReady, user } = useAuth();
  const accountType = user?.account_type;
  const isBusinessVerified = user?.is_business_verified;
  const [profile, setProfile] = useState<ManagedBusinessProfile | null>(null);
  const [savedProfile, setSavedProfile] = useState<ManagedBusinessProfile | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTaxonomies, setIsLoadingTaxonomies] = useState(false);
  const [taxonomies, setTaxonomies] = useState<TaxonomyState>(EMPTY_TAXONOMIES);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [applySharedEditsToAll, setApplySharedEditsToAll] = useState(autoApplySharedEdits);
  const [pendingLeaveAction, setPendingLeaveAction] = useState<PendingLeaveAction | null>(null);
  const hasAutoOpened = useRef(false);

  const hasTaxonomies = useMemo(
    () =>
      Boolean(
        taxonomies.businessCategories.length ||
          taxonomies.productCategories.length ||
          taxonomies.cuisineTypes.length ||
          taxonomies.ownershipMarkers.length ||
          taxonomies.sustainabilityMarkers.length
      ),
    [taxonomies]
  );
  const productCategoryOptions = useMemo(
    () => taxonomies.productCategories.map((item) => ({ label: item.name, value: String(item.id) })),
    [taxonomies.productCategories]
  );
  const businessCategoryOptions = useMemo(
    () => taxonomies.businessCategories.map((item) => ({ label: item.name, value: String(item.id) })),
    [taxonomies.businessCategories]
  );
  const cuisineOptions = useMemo(
    () => taxonomies.cuisineTypes.map((item) => ({ label: item.name, value: String(item.id) })),
    [taxonomies.cuisineTypes]
  );
  const ownershipOptions = useMemo(
    () => taxonomies.ownershipMarkers.map((item) => ({ label: item.name, value: String(item.id) })),
    [taxonomies.ownershipMarkers]
  );
  const moreToLoveOptions = useMemo(
    () => [
      ...taxonomies.sustainabilityMarkers.map((item) => ({ label: item.name, value: String(item.id) })),
      { label: "Vegan-friendly", value: "__vegan__" },
      { label: "Gluten-free-friendly", value: "__gf__" },
    ],
    [taxonomies.sustainabilityMarkers]
  );
  const selectedMoreToLove = useMemo(
    () =>
      profile
        ? [
            ...profile.sustainability_markers.map(String),
            ...(profile.is_vegan_friendly ? ["__vegan__"] : []),
            ...(profile.is_gf_friendly ? ["__gf__"] : []),
          ]
        : [],
    [profile]
  );

  const foodCategoryIds = useMemo(
    () =>
      new Set(
        taxonomies.businessCategories
          .filter((category) => /food/i.test(category.name))
          .map((category) => category.id)
      ),
    [taxonomies.businessCategories]
  );

  const selectedBusinessCategories = profile?.business_categories ?? [];
  const hasMultipleLocations = company.other_locations.length > 0;

  const showsCuisineSection = useMemo(
    () => selectedBusinessCategories.some((categoryId) => foodCategoryIds.has(categoryId)),
    [selectedBusinessCategories, foodCategoryIds]
  );
  const hasUnsavedChanges = useMemo(
    () =>
      Boolean(
        isEditMode &&
          profile &&
          savedProfile &&
          serializeManagedBusinessProfile(profile) !== serializeManagedBusinessProfile(savedProfile)
      ),
    [isEditMode, profile, savedProfile]
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (
      !isAuthenticated ||
      !accessToken ||
      !accountType ||
      accountType !== "business" ||
      !isBusinessVerified
    ) {
      setCanEdit(false);
      setProfile(null);
      setSavedProfile(null);
      setIsChecking(false);
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadManagedProfile() {
      setIsChecking(true);
      try {
        let nextProfile;
        try {
          nextProfile = await getManagedBusinessLocation(token, company.slug);
        } catch (loadError) {
          if (!(loadError instanceof Error) || !isTokenError(loadError.message)) {
            throw loadError;
          }

          const session = readAuthSession();
          if (!session) {
            clearAuthSession();
            throw loadError;
          }

          const refreshed = await refreshAccessToken(session.refresh);
          const nextSession = {
            ...session,
            access: refreshed.access,
            refresh: refreshed.refresh ?? session.refresh,
          };
          writeAuthSession(nextSession);
          nextProfile = await getManagedBusinessLocation(nextSession.access, company.slug);
        }

        if (!isMounted) {
          return;
        }

        setProfile(nextProfile);
        setSavedProfile(nextProfile);
        setCanEdit(true);
      } catch {
        if (isMounted) {
          setProfile(null);
          setSavedProfile(null);
          setCanEdit(false);
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    }

    void loadManagedProfile();

    return () => {
      isMounted = false;
    };
  }, [accessToken, accountType, company.slug, isAuthenticated, isBusinessVerified, isReady]);

  async function ensureTaxonomiesLoaded() {
    if (hasTaxonomies) {
      return;
    }

    setIsLoadingTaxonomies(true);
    try {
      const [
        businessCategories,
        productCategories,
        cuisineTypes,
        ownershipMarkers,
        sustainabilityMarkers,
      ] = await Promise.all([
        listBusinessCategories(),
        listProductCategories(),
        listCuisineTypes(),
        listOwnershipMarkers(),
        listSustainabilityMarkers(),
      ]);

      setTaxonomies({
        businessCategories,
        productCategories,
        cuisineTypes,
        ownershipMarkers,
        sustainabilityMarkers,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load business editing options.");
    } finally {
      setIsLoadingTaxonomies(false);
    }
  }

  function updateField<Key extends keyof ManagedBusinessProfile>(key: Key, value: ManagedBusinessProfile[Key]) {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
    setError("");
    setSuccess("");
  }

  async function handleToggleEditMode() {
    if (!isEditMode) {
      await ensureTaxonomiesLoaded();
    } else if (hasUnsavedChanges) {
      setPendingLeaveAction({ type: "close-editor" });
      return;
    }
    setIsEditMode((current) => !current);
    setError("");
    setSuccess("");
  }

  useEffect(() => {
    if (!autoEdit || !canEdit || isEditMode || hasAutoOpened.current) {
      return;
    }

    hasAutoOpened.current = true;

    async function openEditMode() {
      await ensureTaxonomiesLoaded();
      setApplySharedEditsToAll(autoApplySharedEdits);
      setIsEditMode(true);
      setError("");
      setSuccess("");
    }

    void openEditMode();
  }, [autoApplySharedEdits, autoEdit, canEdit, hasTaxonomies, isEditMode]);

  useEffect(() => {
    if (!isEditMode) {
      setApplySharedEditsToAll(autoApplySharedEdits);
    }
  }, [autoApplySharedEdits, isEditMode]);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setSuccess(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [success]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      if (anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
        return;
      }

      try {
        const currentUrl = new URL(window.location.href);
        const nextUrl = new URL(anchor.href, currentUrl.href);
        if (nextUrl.href === currentUrl.href) {
          return;
        }
      } catch {
        // If URL parsing fails, fall back to warning before leaving.
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingLeaveAction({ type: "navigate", href: anchor.href });
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  function handleCancelLeaveAction() {
    setPendingLeaveAction(null);
  }

  function handleConfirmLeaveAction() {
    if (!pendingLeaveAction) {
      return;
    }

    setProfile(savedProfile);
    setError("");
    setSuccess("");

    if (pendingLeaveAction.type === "close-editor") {
      setIsEditMode(false);
      setPendingLeaveAction(null);
      return;
    }

    window.location.assign(pendingLeaveAction.href);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = await getValidAccessToken();
      if (!token) {
        setError("Please log in again before saving your business profile.");
        return;
      }

      const { id: _id, ...payload } = profile;
      const nextProfile = await updateManagedBusinessLocation(token, company.slug, payload, {
        applySharedFieldsToAll: applySharedEditsToAll,
      });
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      setIsEditMode(false);
      setSuccess(applySharedEditsToAll ? "Business profile updated across all locations." : "Business profile updated.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update your business profile.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isReady || isChecking || !canEdit || !profile) {
    return null;
  }

  const successToast = success
    ? createPortal(
        <div className="detail-save-toast detail-save-toast-success" role="status">
          <div className="detail-save-toast-copy">
            <p>{success}</p>
          </div>
        </div>,
        document.body
      )
    : null;

  const errorToast = error
    ? createPortal(
        <div className="detail-save-toast detail-save-toast-error" role="alert">
          <div className="detail-save-toast-copy">
            <p>{error}</p>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <section className="detail-card company-owner-editor-card">
        <div className="company-owner-editor-header">
          <span className="field-label">Owner tools</span>
          <div className="company-owner-editor-intro">
            <p className="lede">Turn on edit mode to update your company profile. As the owner of this business, only you can see this form.</p>

            <div className="detail-save-toggle-row company-owner-toggle-row">
              <button
                aria-pressed={isEditMode}
                className={isEditMode ? "detail-save-toggle is-active" : "detail-save-toggle"}
                onClick={() => {
                  void handleToggleEditMode();
                }}
                type="button"
              >
                <span className="detail-save-toggle-knob" />
              </button>
              <span className="detail-save-toggle-copy">
                {isEditMode ? "Edit mode on" : "Edit mode off"}
              </span>
            </div>
          </div>
        </div>

        {isEditMode ? (
          <form className="company-owner-editor-form" onSubmit={handleSubmit}>
            <label className="contact-field contact-field-checkbox company-owner-toggle-card">
              <span className="toggle-switch">
                <input
                  type="checkbox"
                  checked={profile.is_published}
                  onChange={(event) => updateField("is_published", event.target.checked)}
                />
                <span className="toggle-slider" aria-hidden="true" />
              </span>
              <div>
                <strong>Display this business in the public SEARCH directory</strong>
                <span className="contact-field-note">
                  Toggle off to keep your profile live but hidden from search results.
                </span>
              </div>
            </label>

            {hasMultipleLocations ? (
              <label className="contact-field contact-field-checkbox company-owner-toggle-card">
                <span className="toggle-switch">
                  <input
                    checked={applySharedEditsToAll}
                    onChange={(event) => setApplySharedEditsToAll(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="toggle-slider" aria-hidden="true" />
                </span>
                <div>
                  <strong>Apply shared edits to all locations</strong>
                  <span className="contact-field-note">
                    Updates shared business details across all your locations while keeping each address, city, state,
                    and ZIP unchanged.
                  </span>
                </div>
              </label>
            ) : null}

            <div className="auth-form-grid">
              <label className="contact-field">
                <span className="contact-field-label">Business name</span>
                <input
                  readOnly
                  aria-describedby="business-name-support-note"
                  value={profile.name}
                />
                <span className="contact-field-note" id="business-name-support-note">
                  Need to update your business name? Contact FOUND support.
                </span>
              </label>

              <label className="contact-field">
                <span className="contact-field-label">Website</span>
                <input
                  onChange={(event) => updateField("website", event.target.value)}
                  placeholder="https://yourbusiness.com"
                  value={profile.website}
                />
              </label>
            </div>

            <label className="contact-field">
              <span className="contact-field-label">Description</span>
              <textarea
                onChange={(event) => updateField("description", event.target.value)}
                rows={4}
                value={profile.description}
              />
            </label>

            <div className="auth-form-grid">
              <label className="contact-field">
                <span className="contact-field-label">Address</span>
                <input
                  onChange={(event) => updateField("address", event.target.value)}
                  value={profile.address}
                />
              </label>

              <div className="auth-form-grid company-owner-location-grid">
                <label className="contact-field">
                  <span className="contact-field-label">City</span>
                  <input
                    onChange={(event) => updateField("city", event.target.value)}
                    value={profile.city}
                  />
                </label>

                <label className="contact-field">
                  <span className="contact-field-label">State</span>
                  <input
                    onChange={(event) => updateField("state", event.target.value)}
                    value={profile.state}
                  />
                </label>

                <label className="contact-field">
                  <span className="contact-field-label">ZIP</span>
                  <input
                    onChange={(event) => updateField("zip_code", event.target.value)}
                    value={profile.zip_code}
                  />
                </label>
              </div>
            </div>

            <BusinessHoursEditor
              businessHours={profile.business_hours}
              onBusinessHoursChange={(value) => updateField("business_hours", value)}
              onTimezoneChange={(value) => updateField("business_hours_timezone", value || null)}
              timezone={profile.business_hours_timezone}
            />

            <div className="company-owner-taxonomy-section">
              <span className="contact-field-label">Business categories</span>
              <TaxonomyMultiSelect
                onToggle={(value) => {
                  const nextCategories = toggleId(profile.business_categories, Number(value));
                  updateField("business_categories", nextCategories);
                  updateField("business_category", nextCategories[0] ?? null);
                }}
                options={businessCategoryOptions}
                placeholder="Choose as many as you like"
                selected={profile.business_categories.map(String)}
                portal={false}
              />
            </div>

            <div className="company-owner-taxonomy-grid">
              <div className="company-owner-taxonomy-section">
                <span className="contact-field-label">Product categories</span>
                <TaxonomyMultiSelect
                  onToggle={(value) =>
                    updateField("product_categories", toggleId(profile.product_categories, Number(value)))
                  }
                  options={productCategoryOptions}
                  placeholder="Choose product categories"
                  selected={profile.product_categories.map(String)}
                  portal={false}
                />
              </div>

              {showsCuisineSection ? (
                <div className="company-owner-taxonomy-section">
                  <span className="contact-field-label">Cuisine</span>
                  <TaxonomyMultiSelect
                    onToggle={(value) => updateField("cuisine_types", toggleId(profile.cuisine_types, Number(value)))}
                    options={cuisineOptions}
                    placeholder="Choose cuisine types"
                    selected={profile.cuisine_types.map(String)}
                    portal={false}
                  />
                </div>
              ) : null}
            </div>

            <div className="company-owner-taxonomy-grid">
              <div className="company-owner-taxonomy-section">
                <span className="contact-field-label">Owned by</span>
                <TaxonomyMultiSelect
                  onToggle={(value) =>
                    updateField("ownership_markers", toggleId(profile.ownership_markers, Number(value)))
                  }
                  options={ownershipOptions}
                  placeholder="Add any ownership details you'd like to share"
                  selected={profile.ownership_markers.map(String)}
                  portal={false}
                />
              </div>

              <div className="company-owner-taxonomy-section">
                <span className="contact-field-label">More to love</span>
                <TaxonomyMultiSelect
                  onToggle={(value) => {
                    if (value === "__vegan__") {
                      updateField("is_vegan_friendly", !profile.is_vegan_friendly);
                      return;
                    }
                    if (value === "__gf__") {
                      updateField("is_gf_friendly", !profile.is_gf_friendly);
                      return;
                    }
                    updateField("sustainability_markers", toggleId(profile.sustainability_markers, Number(value)));
                  }}
                  options={moreToLoveOptions}
                  placeholder="Choose as many as you like"
                  selected={selectedMoreToLove}
                  portal={false}
                />
              </div>
            </div>

            <div className="auth-form-grid">
              <label className="contact-field">
                <span className="contact-field-label">Instagram</span>
                <input
                  onChange={(event) => updateField("instagram_handle", event.target.value)}
                  placeholder="@yourbusiness"
                  value={profile.instagram_handle}
                />
              </label>

              <label className="contact-field">
                <span className="contact-field-label">Facebook</span>
                <input
                  onChange={(event) => updateField("facebook_page", event.target.value)}
                  placeholder="https://facebook.com/yourpage"
                  value={profile.facebook_page}
                />
              </label>

              <label className="contact-field">
                <span className="contact-field-label">LinkedIn</span>
                <input
                  onChange={(event) => updateField("linkedin_page", event.target.value)}
                  placeholder="https://linkedin.com/company/yourbusiness"
                  value={profile.linkedin_page}
                />
              </label>
            </div>

            {isLoadingTaxonomies ? <p className="contact-form-note">Loading editing options...</p> : null}

            <div className="directory-form-actions">
              <button className="contact-submit" disabled={isSaving} type="submit">
                {isSaving ? "Saving..." : "Save business page"}
              </button>
            </div>
          </form>
        ) : null}
      </section>
      {successToast}
      {errorToast}
      <ConfirmDialog
        cancelLabel="Keep editing"
        confirmLabel="Leave without saving"
        isOpen={Boolean(pendingLeaveAction)}
        message={UNSAVED_CHANGES_WARNING}
        onCancel={handleCancelLeaveAction}
        onConfirm={handleConfirmLeaveAction}
        title="Discard your edits?"
      />
    </>
  );
}
