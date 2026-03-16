"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { TaxonomyMultiSelect } from "@/components/taxonomy-multi-select";
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
  const { accessToken, getValidAccessToken, user } = useAuth();
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
    business_categories: [],
    product_categories: [],
    cuisine_types: [],
    ownership_markers: [],
    sustainability_markers: [],
    instagram_handle: latestClaim?.instagram_handle || "",
    facebook_page: latestClaim?.facebook_page || "",
    linkedin_page: latestClaim?.linkedin_page || "",
    is_vegan_friendly: false,
    is_gf_friendly: false,
    is_published: false,
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
    () => [
      ...profile.sustainability_markers.map(String),
      ...(profile.is_vegan_friendly ? ["__vegan__"] : []),
      ...(profile.is_gf_friendly ? ["__gf__"] : []),
    ],
    [profile.is_gf_friendly, profile.is_vegan_friendly, profile.sustainability_markers]
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

  const showsCuisineSection = useMemo(
    () => profile.business_categories.some((categoryId) => foodCategoryIds.has(categoryId)),
    [profile.business_categories, foodCategoryIds]
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
      const token = await getValidAccessToken();
      if (!token) {
        setError("Please log in again before creating your business profile.");
        return;
      }

      const nextProfile = await createManagedBusinessProfile(token, profile);
      router.push(`/companies/${nextProfile.slug}?edit=1`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create your business profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="detail-card company-owner-editor-card company-owner-creation-card">
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
          />
        </div>

        <div className="company-owner-taxonomy-grid">
          <div className="company-owner-taxonomy-section">
            <span className="contact-field-label">Product categories</span>
            <TaxonomyMultiSelect
              onToggle={(value) => updateField("product_categories", toggleId(profile.product_categories, Number(value)))}
              options={productCategoryOptions}
              placeholder="Choose product categories"
              selected={profile.product_categories.map(String)}
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
              />
            </div>
          ) : null}
        </div>

        <div className="company-owner-taxonomy-grid">
          <div className="company-owner-taxonomy-section">
            <span className="contact-field-label">Owned by</span>
            <TaxonomyMultiSelect
              onToggle={(value) => updateField("ownership_markers", toggleId(profile.ownership_markers, Number(value)))}
              options={ownershipOptions}
              placeholder="Add any ownership details you'd like to share"
              selected={profile.ownership_markers.map(String)}
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
