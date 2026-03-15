"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import {
  createManagedBusinessProfile,
  listBusinessCategories,
  listCuisineTypes,
  listOwnershipMarkers,
  listProductCategories,
  listSustainabilityMarkers,
} from "@/lib/api";
import type { BusinessClaim } from "@/types/auth";
import type { ManagedBusinessProfile, TaxonomyItem } from "@/types/company";

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

export function CompanyProfileCreationForm({
  latestClaim,
}: {
  latestClaim: BusinessClaim | null;
}) {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [isLoadingTaxonomies, setIsLoadingTaxonomies] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [taxonomies, setTaxonomies] = useState<TaxonomyState>(EMPTY_TAXONOMIES);
  const [profile, setProfile] = useState<Omit<ManagedBusinessProfile, "id" | "slug">>({
    name: latestClaim?.business_name || user?.display_name || "",
    description: "",
    website: latestClaim?.website || "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    business_category: null,
    product_categories: [],
    cuisine_types: [],
    ownership_markers: [],
    sustainability_markers: [],
    instagram_handle: latestClaim?.instagram_handle || "",
    facebook_page: latestClaim?.facebook_page || "",
    linkedin_page: latestClaim?.linkedin_page || "",
    is_vegan_friendly: false,
    is_gf_friendly: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadTaxonomies() {
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

        if (!isMounted) {
          return;
        }

        setTaxonomies({
          businessCategories,
          productCategories,
          cuisineTypes,
          ownershipMarkers,
          sustainabilityMarkers,
        });
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load company profile options.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingTaxonomies(false);
        }
      }
    }

    void loadTaxonomies();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasAnyTaxonomies = useMemo(
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

  function updateField<Key extends keyof Omit<ManagedBusinessProfile, "id" | "slug">>(
    key: Key,
    value: Omit<ManagedBusinessProfile, "id" | "slug">[Key]
  ) {
    setProfile((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setError("Please log in again before creating your business profile.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const nextProfile = await createManagedBusinessProfile(accessToken, profile);
      router.push(`/companies/${nextProfile.slug}?edit=1`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create your business profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="detail-card company-owner-editor-card company-owner-creation-card">
      <div className="company-owner-editor-header">
        <div>
          <span className="field-label">Create your company profile</span>
          <p className="lede">
            Start the real business page people will see on FOUND. Once it&apos;s created, you&apos;ll edit the live
            profile directly.
          </p>
        </div>
      </div>

      <form className="company-owner-editor-form" onSubmit={handleSubmit}>
        <div className="auth-form-grid">
          <label className="contact-field">
            <span className="contact-field-label">Business name</span>
            <input
              onChange={(event) => updateField("name", event.target.value)}
              required
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
            <input onChange={(event) => updateField("address", event.target.value)} value={profile.address} />
          </label>

          <div className="auth-form-grid company-owner-location-grid">
            <label className="contact-field">
              <span className="contact-field-label">City</span>
              <input onChange={(event) => updateField("city", event.target.value)} value={profile.city} />
            </label>

            <label className="contact-field">
              <span className="contact-field-label">State</span>
              <input onChange={(event) => updateField("state", event.target.value)} value={profile.state} />
            </label>

            <label className="contact-field">
              <span className="contact-field-label">ZIP</span>
              <input onChange={(event) => updateField("zip_code", event.target.value)} value={profile.zip_code} />
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

        {isLoadingTaxonomies ? <p className="contact-form-note">Loading profile options...</p> : null}
        {!isLoadingTaxonomies && !hasAnyTaxonomies ? (
          <p className="contact-form-note">Some categories are still loading. You can save the basics first.</p>
        ) : null}
        {error ? <p className="contact-form-note is-error">{error}</p> : null}

        <div className="directory-form-actions">
          <button className="contact-submit" disabled={isSaving} type="submit">
            {isSaving ? "Creating..." : "Create business page"}
          </button>
        </div>
      </form>
    </section>
  );
}
