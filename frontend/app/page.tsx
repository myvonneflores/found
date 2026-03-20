import type { Metadata } from "next";
import Link from "next/link";

import { BodyClass } from "@/components/body-class";
import { RememberedDirectoryLink } from "@/components/remembered-directory-link";
import { SiteHeader } from "@/components/site-header";
import { listCompanies } from "@/lib/api";
import { CompanyListItem } from "@/types/company";

export const metadata: Metadata = {
  title: "Found",
  description: "Discover locally owned businesses by category, ownership, and the things that make them special.",
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 300;

const fallbackFeaturedCompanies = [
  {
    name: "Banshee",
    slug: "banshee",
    description: "Vintage clothing + thoughtful objects",
    city: "Portland",
    state: "OR",
    country: "USA",
    listing_origin: "imported",
    is_community_listed: false,
    business_category: "Retail",
    business_categories: ["Retail"],
    ownership_markers: ["Woman Owned"],
    sustainability_markers: ["Vintage", "Sustainable"],
    product_categories: [],
    cuisine_types: [],
    id: 0,
    id_hash: "fallback-banshee",
    is_vegan_friendly: false,
    is_gf_friendly: false,
  },
  {
    name: "Adored Vintage",
    slug: "adored-vintage",
    description: "Romantic wardrobe staples and home finds",
    city: "Portland",
    state: "OR",
    country: "USA",
    listing_origin: "imported",
    is_community_listed: false,
    business_category: "Retail",
    business_categories: ["Retail"],
    ownership_markers: ["Woman Owned"],
    sustainability_markers: ["Vintage", "Independent Designers"],
    product_categories: [],
    cuisine_types: [],
    id: 0,
    id_hash: "fallback-adored-vintage",
    is_vegan_friendly: false,
    is_gf_friendly: false,
  },
  {
    name: "Artifact",
    slug: "artifact",
    description: "Collected home goods, apparel, and everyday design",
    city: "Portland",
    state: "OR",
    country: "USA",
    listing_origin: "imported",
    is_community_listed: false,
    business_category: "Retail",
    business_categories: ["Retail"],
    ownership_markers: ["Independent"],
    sustainability_markers: ["Sustainable"],
    product_categories: [],
    cuisine_types: [],
    id: 0,
    id_hash: "fallback-artifact",
    is_vegan_friendly: false,
    is_gf_friendly: false,
  },
  {
    name: "Assembly",
    slug: "assembly",
    description: "A modern general store for clothing, gifts, and objects",
    city: "Portland",
    state: "OR",
    country: "USA",
    listing_origin: "imported",
    is_community_listed: false,
    business_category: "Retail",
    business_categories: ["Retail"],
    ownership_markers: ["Family Owned"],
    sustainability_markers: ["Independent Designers"],
    product_categories: [],
    cuisine_types: [],
    id: 0,
    id_hash: "fallback-assembly",
    is_vegan_friendly: false,
    is_gf_friendly: false,
  },
] satisfies CompanyListItem[];

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function primaryOwnership(company: CompanyListItem) {
  return company.ownership_markers[0] ?? "";
}

function hasStrongPreview(company: CompanyListItem) {
  return Boolean(
    normalizeText(company.description) &&
      normalizeText(company.city) &&
      normalizeText(company.state) &&
      company.business_category &&
      (company.ownership_markers.length > 0 || company.sustainability_markers.length > 0),
  );
}

function previewScore(company: CompanyListItem) {
  return (
    normalizeText(company.description).length +
    company.ownership_markers.length * 18 +
    company.sustainability_markers.length * 14 +
    (company.business_category ? 24 : 0)
  );
}

function selectDiverseCompanies(companies: CompanyListItem[], limit: number) {
  const pool = companies.filter(hasStrongPreview);
  const selected: CompanyListItem[] = [];
  const usedCities = new Set<string>();
  const usedCategories = new Set<string>();
  const usedOwnership = new Set<string>();

  while (selected.length < limit) {
    let bestCompany: CompanyListItem | null = null;
    let bestScore = -Infinity;

    for (const company of pool) {
      if (selected.some((item) => item.slug === company.slug)) {
        continue;
      }

      const cityKey = normalizeText(company.city).toLowerCase();
      const categoryKey = normalizeText(company.business_category).toLowerCase();
      const ownershipKey = normalizeText(primaryOwnership(company)).toLowerCase();

      let score = previewScore(company);
      if (cityKey && !usedCities.has(cityKey)) {
        score += 120;
      }
      if (categoryKey && !usedCategories.has(categoryKey)) {
        score += 90;
      }
      if (ownershipKey && !usedOwnership.has(ownershipKey)) {
        score += 70;
      }

      if (score > bestScore) {
        bestCompany = company;
        bestScore = score;
      }
    }

    if (!bestCompany) {
      break;
    }

    selected.push(bestCompany);
    usedCities.add(normalizeText(bestCompany.city).toLowerCase());
    usedCategories.add(normalizeText(bestCompany.business_category).toLowerCase());
    usedOwnership.add(normalizeText(primaryOwnership(bestCompany)).toLowerCase());
  }

  return selected;
}

function mergeFallbacks(companies: CompanyListItem[], limit: number) {
  const merged = [...companies];
  for (const fallback of fallbackFeaturedCompanies) {
    if (merged.length >= limit) {
      break;
    }
    if (!merged.some((company) => company.slug === fallback.slug)) {
      merged.push(fallback);
    }
  }
  return merged.slice(0, limit);
}

function featureTags(company: CompanyListItem) {
  const tags = [...company.ownership_markers, ...company.sustainability_markers];
  if (company.business_category) {
    tags.unshift(company.business_category);
  }
  return tags.slice(0, 3);
}

function companyLocation(company: CompanyListItem) {
  return [company.city, company.state].filter(Boolean).join(", ");
}

export default async function HomePage() {
  const companiesResult = await listCompanies({}, { pageSize: 48 }).catch(() => null);
  const curatedFeaturedCompanies = companiesResult ? selectDiverseCompanies(companiesResult.results, 4) : [];
  const featuredCompanies = mergeFallbacks(curatedFeaturedCompanies, 4);

  return (
    <main className="page-shell directory-page-shell home-page-shell">
      <BodyClass className="home-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/" />

        <section className="home-hero-grid">
          <article className="home-hero-card home-hero-copy">
            <div className="home-hero-layout">
              <div className="home-hero-text">
                <h1 className="home-hero-title">Find the good stuff nearby</h1>
                <p className="home-hero-lede">
                  Discover locally owned businesses based on what matters to you, then save favorites, create lists
                  you can text, email, or link anywhere your community finds you.
                </p>
              </div>
              <div className="home-hero-actions">
                <Link className="about-cta-link" href="/signup">
                  Create Account
                </Link>
                <RememberedDirectoryLink className="about-cta-link">Start Finding</RememberedDirectoryLink>
              </div>
            </div>
          </article>
        </section>

        <section className="home-section home-section-rose">
          <article className="home-section-card">
            <div className="home-section-heading">
              <h2>Featured finds</h2>
            </div>
            <div className="home-featured-grid">
              {featuredCompanies.map((company) => (
                <Link className="home-feature-card" href={`/companies/${company.slug}`} key={company.slug}>
                <div className="home-feature-copy">
                  <h3>{company.name}</h3>
                  <span>{companyLocation(company)}</span>
                </div>
                  <div className="home-pill-row">
                    {featureTags(company).map((tag) => (
                      <span className="badge badge-outline home-feature-pill" key={`${company.slug}-${tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </article>
        </section>

        <section className="home-section home-section-cream">
          <article className="home-section-card home-suggest-card">
            <div className="home-section-heading">
              <h2>Know a business we should feature?</h2>
              <p>
                Recommend a locally owned business and help more people discover great spots in their community.
              </p>
            </div>
            <Link className="about-cta-link" href="/contact">
              Recommend a Business
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
