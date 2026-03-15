"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import {
  getManagedBusinessProfile,
  listBusinessCategories,
  listCuisineTypes,
  listOwnershipMarkers,
  listProductCategories,
  listSustainabilityMarkers,
  updateManagedBusinessProfile,
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

function toggleId(current: number[], nextId: number) {
  return current.includes(nextId) ? current.filter((value) => value !== nextId) : [...current, nextId];
}

export function CompanyOwnerEditor({
  company,
  autoEdit = false,
}: {
  company: CompanyDetail;
  autoEdit?: boolean;
}) {
  const router = useRouter();
  const { accessToken, isAuthenticated, isReady, user } = useAuth();
  const [profile, setProfile] = useState<ManagedBusinessProfile | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTaxonomies, setIsLoadingTaxonomies] = useState(false);
  const [taxonomies, setTaxonomies] = useState<TaxonomyState>(EMPTY_TAXONOMIES);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const token = accessToken;

    if (
      !isAuthenticated ||
      !token ||
      !user ||
      user.account_type !== "business" ||
      !user.is_business_verified
    ) {
      setCanEdit(false);
      setProfile(null);
      setIsChecking(false);
      return;
    }

    let isMounted = true;

    async function loadManagedProfile() {
      setIsChecking(true);
      try {
        const nextProfile = await getManagedBusinessProfile(token!);
        if (!isMounted) {
          return;
        }
        if (nextProfile.slug === company.slug) {
          setProfile(nextProfile);
          setCanEdit(true);
        } else {
          setProfile(null);
          setCanEdit(false);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
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
  }, [accessToken, company.slug, isAuthenticated, isReady, user]);

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
      setIsEditMode(true);
      setError("");
      setSuccess("");
    }

    void openEditMode();
  }, [autoEdit, canEdit, hasTaxonomies, isEditMode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !profile) {
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const { id: _id, ...payload } = profile;
      const nextProfile = await updateManagedBusinessProfile(accessToken, payload);
      setProfile(nextProfile);
      setSuccess("Business profile updated.");
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

  return (
    <section className="detail-card company-owner-editor-card">
      <div className="company-owner-editor-header">
        <div>
          <span className="field-label">Owner tools</span>
          <p className="lede">Turn on edit mode to update the real business page customers see on FOUND.</p>
        </div>

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

      {isEditMode ? (
        <form className="company-owner-editor-form" onSubmit={handleSubmit}>
          <div className="auth-form-grid">
            <label className="contact-field">
              <span className="contact-field-label">Business name</span>
              <input
                onChange={(event) => updateField("name", event.target.value)}
                value={profile.name}
              />
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

          <div className="auth-form-grid">
            <label className="contact-field">
              <span className="contact-field-label">Business category</span>
              <select
                onChange={(event) =>
                  updateField("business_category", event.target.value ? Number(event.target.value) : null)
                }
                value={profile.business_category ?? ""}
              >
                <option value="">Choose a category</option>
                {taxonomies.businessCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="company-owner-flags">
              <label className="auth-checkbox">
                <input
                  checked={profile.is_vegan_friendly}
                  onChange={(event) => updateField("is_vegan_friendly", event.target.checked)}
                  type="checkbox"
                />
                <span>Vegan-friendly</span>
              </label>

              <label className="auth-checkbox">
                <input
                  checked={profile.is_gf_friendly}
                  onChange={(event) => updateField("is_gf_friendly", event.target.checked)}
                  type="checkbox"
                />
                <span>Gluten-free-friendly</span>
              </label>
            </div>
          </div>

          <div className="company-owner-taxonomy-grid">
            <div className="company-owner-taxonomy-section">
              <span className="contact-field-label">Product categories</span>
              <div className="directory-category-cloud">
                {taxonomies.productCategories.map((item) => (
                  <button
                    className={
                      profile.product_categories.includes(item.id)
                        ? "badge badge-outline company-owner-tag is-selected"
                        : "badge badge-outline company-owner-tag"
                    }
                    key={item.id}
                    onClick={() => updateField("product_categories", toggleId(profile.product_categories, item.id))}
                    type="button"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="company-owner-taxonomy-section">
              <span className="contact-field-label">Cuisine</span>
              <div className="directory-category-cloud">
                {taxonomies.cuisineTypes.map((item) => (
                  <button
                    className={
                      profile.cuisine_types.includes(item.id)
                        ? "badge badge-outline company-owner-tag is-selected"
                        : "badge badge-outline company-owner-tag"
                    }
                    key={item.id}
                    onClick={() => updateField("cuisine_types", toggleId(profile.cuisine_types, item.id))}
                    type="button"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="company-owner-taxonomy-grid">
            <div className="company-owner-taxonomy-section">
              <span className="contact-field-label">Owned by</span>
              <div className="directory-category-cloud">
                {taxonomies.ownershipMarkers.map((item) => (
                  <button
                    className={
                      profile.ownership_markers.includes(item.id)
                        ? "badge badge-outline company-owner-tag is-selected"
                        : "badge badge-outline company-owner-tag"
                    }
                    key={item.id}
                    onClick={() => updateField("ownership_markers", toggleId(profile.ownership_markers, item.id))}
                    type="button"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="company-owner-taxonomy-section">
              <span className="contact-field-label">Sustainability markers</span>
              <div className="directory-category-cloud">
                {taxonomies.sustainabilityMarkers.map((item) => (
                  <button
                    className={
                      profile.sustainability_markers.includes(item.id)
                        ? "badge badge-outline company-owner-tag is-selected"
                        : "badge badge-outline company-owner-tag"
                    }
                    key={item.id}
                    onClick={() =>
                      updateField("sustainability_markers", toggleId(profile.sustainability_markers, item.id))
                    }
                    type="button"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
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
          {error ? <p className="contact-form-note is-error">{error}</p> : null}
          {success ? <p className="contact-form-note is-success">{success}</p> : null}

          <div className="directory-form-actions">
            <button className="contact-submit" disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save business page"}
            </button>
          </div>
        </form>
      ) : (
        <p className="lede">Turn edit mode on to update your description, categories, markers, and social links right here.</p>
      )}
    </section>
  );
}
