import type { Metadata } from "next";

import { CompanyCard } from "@/components/company-card";
import { CompanyFilters } from "@/components/company-filters";
import {
  hasActiveFilters,
  listBusinessCategories,
  listCompanies,
  listProductCategories,
  listSustainabilityMarkers,
} from "@/lib/api";
import { CompanySearchParams } from "@/types/company";

export const dynamic = "force-dynamic";

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(",");
  }
  return value;
}

function normalizeSearchParams(searchParams: Record<string, string | string[] | undefined>): CompanySearchParams {
  return {
    search: normalizeParam(searchParams.search),
    city: normalizeParam(searchParams.city),
    state: normalizeParam(searchParams.state),
    country: normalizeParam(searchParams.country),
    business_category: normalizeParam(searchParams.business_category),
    product_categories: normalizeParam(searchParams.product_categories),
    sustainability_markers: normalizeParam(searchParams.sustainability_markers),
    is_vegan_friendly: normalizeParam(searchParams.is_vegan_friendly),
    is_gf_friendly: normalizeParam(searchParams.is_gf_friendly),
    ordering: normalizeParam(searchParams.ordering),
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = normalizeSearchParams(await searchParams);
  const isFiltered = hasActiveFilters(params);

  return {
    title: isFiltered ? "Filtered companies" : "Browse companies",
    description: "Browse curated companies across retail, food, and wellness.",
    alternates: {
      canonical: "/companies",
    },
    robots: isFiltered ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = normalizeSearchParams(await searchParams);
  const [companies, businessCategories, productCategories, sustainabilityMarkers] = await Promise.all([
    listCompanies(params),
    listBusinessCategories(),
    listProductCategories(),
    listSustainabilityMarkers(),
  ]);

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="badge">Directory</span>
        <h1>Find companies by place, focus, and values.</h1>
        <p>
          Search a public directory of retail, food, and wellness businesses with
          filters that stay reflected in the URL for discoverability and sharing.
        </p>
      </section>

      <section className="directory-layout">
        <CompanyFilters
          businessCategories={businessCategories}
          productCategories={productCategories}
          searchParams={params}
          sustainabilityMarkers={sustainabilityMarkers}
        />

        <div className="results-column">
          <div className="panel results-header">
            <span className="field-label">Results</span>
            <div className="section-title">{companies.count} companies</div>
            <div className="muted">
              Core directory pages are indexable. Filtered results are still shareable, but marked
              `noindex` to avoid thin SEO duplication.
            </div>
          </div>

          {companies.results.length ? (
            <div className="company-grid">
              {companies.results.map((company) => (
                <CompanyCard company={company} key={company.id} />
              ))}
            </div>
          ) : (
            <div className="panel empty-state">
              <h2 className="section-title">No matches</h2>
              <p className="lede">Try removing one or two filters or broadening your search terms.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
