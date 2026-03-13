import type { Metadata } from "next";

import { CompanyDirectory } from "@/components/company-directory";
import {
  getCompany,
  hasActiveFilters,
  listBusinessCategories,
  listCities,
  listCompanies,
  listOwnershipMarkers,
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
    ownership_markers: normalizeParam(searchParams.ownership_markers),
    sustainability_markers: normalizeParam(searchParams.sustainability_markers),
    is_vegan_friendly: normalizeParam(searchParams.is_vegan_friendly),
    is_gf_friendly: normalizeParam(searchParams.is_gf_friendly),
    ordering: normalizeParam(searchParams.ordering),
    selected: normalizeParam(searchParams.selected),
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
    description: "Browse local-first businesses without the chain-store noise.",
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
  const isFiltered = hasActiveFilters(params);
  const [companies, cities, businessCategories, ownershipMarkers, sustainabilityMarkers] = await Promise.all([
    isFiltered ? listCompanies(params) : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    listCities(),
    listBusinessCategories(),
    listOwnershipMarkers(),
    listSustainabilityMarkers(),
  ]);
  const defaultSlug = isFiltered ? params.selected : undefined;
  const selectedCompany = defaultSlug ? await getCompany(defaultSlug).catch(() => null) : null;

  return (
    <main className="page-shell directory-page-shell">
      <CompanyDirectory
        businessCategories={businessCategories}
        brandHref="/"
        cities={cities}
        companies={companies.results}
        hasActiveFilters={isFiltered}
        ownershipMarkers={ownershipMarkers}
        searchParams={params}
        selectedCompany={selectedCompany}
        sustainabilityMarkers={sustainabilityMarkers}
      />
    </main>
  );
}
