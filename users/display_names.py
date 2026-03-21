import re


DISPLAY_NAME_MAX_LENGTH = 120
WHITESPACE_RE = re.compile(r"\s+")


def normalize_display_name(value: str) -> str:
    return WHITESPACE_RE.sub(" ", (value or "").strip())


def derive_personal_display_name(display_name: str, first_name: str, email: str) -> str:
    normalized = normalize_display_name(display_name)
    if normalized:
        return normalized[:DISPLAY_NAME_MAX_LENGTH]

    normalized_first_name = normalize_display_name(first_name)
    if normalized_first_name:
        return normalized_first_name[:DISPLAY_NAME_MAX_LENGTH]

    email_prefix = (email or "").split("@")[0]
    fallback = normalize_display_name(email_prefix) or "Found Member"
    return fallback[:DISPLAY_NAME_MAX_LENGTH]


def ensure_unique_suffix(base_name: str, counter: int) -> str:
    suffix = f" {counter}"
    trimmed_base = base_name[: max(0, DISPLAY_NAME_MAX_LENGTH - len(suffix))].rstrip()
    return f"{trimmed_base}{suffix}" if trimmed_base else str(counter)


def build_display_name_suggestions(
    base_name: str,
    *,
    is_taken,
    limit: int = 3,
) -> list[str]:
    normalized_base = normalize_display_name(base_name) or "Found Member"
    suggestions: list[str] = []
    counter = 2

    while len(suggestions) < limit:
        candidate = ensure_unique_suffix(normalized_base, counter)
        if not is_taken(candidate):
            suggestions.append(candidate)
        counter += 1

    return suggestions
