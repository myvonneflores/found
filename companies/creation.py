from dataclasses import dataclass


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


def assess_new_company_listing(*, existing_companies, name: str, website: str, city: str, state: str, address: str):
    hostname = normalized_hostname(website)
    normalized_name = normalize_company_text(name)
    normalized_city = normalize_company_text(city)
    normalized_state = normalize_company_text(state)
    normalized_address = normalize_company_text(address)

    assessment = CompanyCreationAssessment()

    for company in existing_companies:
        existing_hostname = normalized_hostname(company.website)
        if hostname and existing_hostname == hostname:
            return CompanyCreationAssessment(is_duplicate=True)

        if normalize_company_text(company.name) != normalized_name:
            continue

        if normalize_company_text(company.city) != normalized_city:
            continue

        if normalize_company_text(company.state) != normalized_state:
            continue

        if normalize_company_text(company.address) == normalized_address:
            return CompanyCreationAssessment(is_duplicate=True)

        assessment.needs_editorial_review = True

    return assessment
