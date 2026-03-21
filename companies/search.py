import re

from django.db.models import Q
from django.utils.text import smart_split


def split_search_terms(value):
    return [term.strip("\"'") for term in smart_split(value or "") if term.strip("\"'")]


def build_apostrophe_insensitive_pattern(term):
    normalized_term = term.replace("'", "").replace("’", "")
    if not normalized_term:
        return None
    return "['’]?".join(re.escape(character) for character in normalized_term)


def build_apostrophe_insensitive_query(term, field_names):
    pattern = build_apostrophe_insensitive_pattern(term)
    term_query = Q()

    for field_name in field_names:
        term_query |= Q(**{f"{field_name}__icontains": term})
        if pattern:
            term_query |= Q(**{f"{field_name}__iregex": pattern})

    return term_query
