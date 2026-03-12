import { CompanySearchParams, TaxonomyItem } from "@/types/company";

function selectedValues(value?: string) {
  return new Set((value ?? "").split(",").filter(Boolean));
}

export function CompanyFilters({
  searchParams,
  businessCategories,
  productCategories,
  sustainabilityMarkers,
}: {
  searchParams: CompanySearchParams;
  businessCategories: TaxonomyItem[];
  productCategories: TaxonomyItem[];
  sustainabilityMarkers: TaxonomyItem[];
}) {
  const selectedProducts = selectedValues(searchParams.product_categories);
  const selectedMarkers = selectedValues(searchParams.sustainability_markers);

  return (
    <aside className="panel">
      <form action="/companies" method="get">
        <div className="filter-group">
          <label>
            <span className="field-label">Search</span>
            <input defaultValue={searchParams.search} name="search" placeholder="Name, description, place" />
          </label>
          <label>
            <span className="field-label">City</span>
            <input defaultValue={searchParams.city} name="city" placeholder="Portland" />
          </label>
        </div>

        <div className="filter-group">
          <label>
            <span className="field-label">Business category</span>
            <select defaultValue={searchParams.business_category ?? ""} name="business_category">
              <option value="">All categories</option>
              {businessCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Sort</span>
            <select defaultValue={searchParams.ordering ?? "name"} name="ordering">
              <option value="name">Name A-Z</option>
              <option value="-created_at">Newest added</option>
              <option value="founded_year">Oldest founded year</option>
              <option value="-founded_year">Newest founded year</option>
            </select>
          </label>
        </div>

        <div className="filter-group">
          <span className="field-label">Product categories</span>
          <div className="checkbox-row">
            {productCategories.map((category) => (
              <label key={category.id}>
                <input
                  defaultChecked={selectedProducts.has(category.name)}
                  name="product_categories"
                  type="checkbox"
                  value={category.name}
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="field-label">Sustainability markers</span>
          <div className="checkbox-row">
            {sustainabilityMarkers.map((marker) => (
              <label key={marker.id}>
                <input
                  defaultChecked={selectedMarkers.has(marker.name)}
                  name="sustainability_markers"
                  type="checkbox"
                  value={marker.name}
                />
                <span>{marker.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group checkbox-row">
          <label>
            <input
              defaultChecked={searchParams.is_vegan_friendly === "true"}
              name="is_vegan_friendly"
              type="checkbox"
              value="true"
            />
            <span>Vegan-friendly</span>
          </label>
          <label>
            <input
              defaultChecked={searchParams.is_gf_friendly === "true"}
              name="is_gf_friendly"
              type="checkbox"
              value="true"
            />
            <span>Gluten-free-friendly</span>
          </label>
        </div>

        <div className="hero-actions">
          <button className="button button-primary" type="submit">
            Apply filters
          </button>
          <a className="button button-secondary" href="/companies">
            Reset
          </a>
        </div>
      </form>
    </aside>
  );
}
