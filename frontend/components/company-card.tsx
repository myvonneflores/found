import Link from "next/link";

import { CompanyListItem } from "@/types/company";

function locationLabel(company: CompanyListItem) {
  return [company.city, company.state, company.country].filter(Boolean).join(", ");
}

export function CompanyCard({ company }: { company: CompanyListItem }) {
  return (
    <article className="company-card">
      <div className="filter-chip-row">
        {company.business_category ? <span className="badge">{company.business_category}</span> : null}
        {company.is_vegan_friendly ? <span className="badge">Vegan-friendly</span> : null}
        {company.is_gf_friendly ? <span className="badge">Gluten-free-friendly</span> : null}
      </div>
      <h2>
        <Link href={`/companies/${company.slug}`}>{company.name}</Link>
      </h2>
      <p>{company.description || "No description available yet."}</p>
      <div className="meta-row">
        {locationLabel(company) ? <span className="muted">{locationLabel(company)}</span> : null}
      </div>
      <div className="company-card-footer">
        {company.product_categories.map((item) => (
          <span className="badge" key={item}>
            {item}
          </span>
        ))}
      </div>
    </article>
  );
}
