from dataclasses import dataclass

from .models import CompanyGroup


def normalize_company_text(value: str) -> str:
    return " ".join((value or "").strip().split()).lower()


def normalized_hostname(value: str) -> str:
    from urllib.parse import urlparse

    if not value:
        return ""
    parsed = urlparse(value)
    hostname = parsed.netloc or parsed.path
    hostname = hostname.lower().strip()
    if hostname.startswith("www."):
        hostname = hostname[4:]
    return hostname.rstrip("/")


@dataclass
class CompanyCreationAssessment:
    is_duplicate: bool = False
    needs_editorial_review: bool = False
    address_required_for_shared_hostname: bool = False
    matched_hostname_companies: list | None = None


def normalize_company_address(value: str) -> str:
    return normalize_company_text(value)


def resolve_company_group(*, company, preferred_group=None, matched_hostname_companies=None, hostname=""):
    if preferred_group is not None:
        if hostname and not preferred_group.normalized_hostname:
            preferred_group.normalized_hostname = hostname
            preferred_group.save(update_fields=("normalized_hostname", "updated_at"))
        return preferred_group

    matched_hostname_companies = matched_hostname_companies or []
    if not matched_hostname_companies:
        return None

    existing_group = next(
        (matched_company.company_group for matched_company in matched_hostname_companies if matched_company.company_group_id),
        None,
    )
    if existing_group is None:
        anchor = matched_hostname_companies[0]
        existing_group = CompanyGroup.objects.create(
            name=anchor.name or company.name,
            normalized_hostname=hostname,
        )
        for matched_company in matched_hostname_companies:
            if matched_company.company_group_id != existing_group.id:
                matched_company.company_group = existing_group
                matched_company.save(update_fields=("company_group", "updated_at"))
    elif hostname and not existing_group.normalized_hostname:
        existing_group.normalized_hostname = hostname
        existing_group.save(update_fields=("normalized_hostname", "updated_at"))

    return existing_group


def assess_new_company_listing(*, existing_companies, name: str, website: str, city: str, state: str, address: str):
    hostname = normalized_hostname(website)
    normalized_name = normalize_company_text(name)
    normalized_city = normalize_company_text(city)
    normalized_state = normalize_company_text(state)
    normalized_address = normalize_company_address(address)

    assessment = CompanyCreationAssessment()
    matched_hostname_companies = []

    for company in existing_companies:
        existing_hostname = normalized_hostname(company.website)
        existing_address = normalize_company_address(company.address)

        if hostname and existing_hostname == hostname:
            if not normalized_address:
                return CompanyCreationAssessment(address_required_for_shared_hostname=True)
            if existing_address and existing_address == normalized_address:
                return CompanyCreationAssessment(is_duplicate=True)
            matched_hostname_companies.append(company)
            continue

        if normalize_company_text(company.name) != normalized_name:
            continue

        if normalize_company_text(company.city) != normalized_city:
            continue

        if normalize_company_text(company.state) != normalized_state:
            continue

        if existing_address == normalized_address:
            return CompanyCreationAssessment(is_duplicate=True)

        assessment.needs_editorial_review = True

    assessment.matched_hostname_companies = matched_hostname_companies
    return assessment
