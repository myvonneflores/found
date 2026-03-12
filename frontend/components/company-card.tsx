import Link from "next/link";

import { listDescription } from "@/lib/company-copy";
import { CompanyListItem } from "@/types/company";

function locationLabel(company: CompanyListItem) {
  return [company.city, company.state, company.country].filter(Boolean).join(", ");
}

export function CompanyCard({ company }: { company: CompanyListItem }) {
  const description = listDescription(company);
  const hasWebsite = Boolean(company.slug);

  return (
    <article className="company-card">
      <div className="filter-chip-row">
        {company.business_category ? <span className="badge">{company.business_category}</span> : null}
        {company.is_vegan_friendly ? <span className="badge">Vegan-friendly</span> : null}
        {company.is_gf_friendly ? <span className="badge">Gluten-free-friendly</span> : null}
        {!company.description ? <span className="badge badge-muted">Curated summary pending</span> : null}
      </div>
      <h2>
        <Link href={`/companies/${company.slug}`}>{company.name}</Link>
      </h2>
      <p>{description}</p>
      <div className="meta-row">
        {locationLabel(company) ? <span className="muted">{locationLabel(company)}</span> : null}
      </div>
      <div className="company-card-footer">
        {company.product_categories.map((item) => (
          <span className="badge" key={item}>
            {item}
          </span>
        ))}
        {hasWebsite ? <span className="badge badge-outline">Profile available</span> : null}
      </div>
    </article>
  );
}
