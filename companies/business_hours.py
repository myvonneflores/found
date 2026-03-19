from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date
from zoneinfo import ZoneInfo

from rest_framework import serializers

WEEKDAYS = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)

MAX_INTERVALS_PER_DAY = 3
MAX_OVERRIDE_DATES = 366


def empty_business_hours():
    return {
        "open_by_week": {day: [] for day in WEEKDAYS},
        "open_by_date": {},
    }


def _normalize_timezone(value):
    if value is None:
        return None
    if not isinstance(value, str):
        raise serializers.ValidationError("Enter a valid IANA timezone.")
    normalized = value.strip()
    return normalized or None


def validate_timezone(value):
    normalized = _normalize_timezone(value)
    if normalized is None:
        return None

    try:
        ZoneInfo(normalized)
    except Exception as exc:  # pragma: no cover - ZoneInfo raises implementation-specific subclasses
        raise serializers.ValidationError("Enter a valid IANA timezone.") from exc

    return normalized


def _validate_interval_list(value, *, context_label):
    if not isinstance(value, list):
        raise serializers.ValidationError(f"{context_label} must be a list of time intervals.")

    if len(value) > MAX_INTERVALS_PER_DAY:
        raise serializers.ValidationError(
            f"{context_label} may not contain more than {MAX_INTERVALS_PER_DAY} intervals."
        )

    normalized_intervals = []
    previous_end = None

    for index, interval in enumerate(value, start=1):
        label = f"{context_label} interval {index}"
        if not isinstance(interval, Mapping):
            raise serializers.ValidationError(f"{label} must be an object with start and end times.")

        interval_keys = set(interval.keys())
        if interval_keys != {"start", "end"}:
            raise serializers.ValidationError(f"{label} must only include start and end.")

        start = interval.get("start")
        end = interval.get("end")
        if not isinstance(start, str) or not isinstance(end, str):
            raise serializers.ValidationError(f"{label} start and end must be HH:MM strings.")

        normalized_start = start.strip()
        normalized_end = end.strip()
        if (
            len(normalized_start) != 5
            or len(normalized_end) != 5
            or normalized_start[2] != ":"
            or normalized_end[2] != ":"
        ):
            raise serializers.ValidationError(f"{label} start and end must be HH:MM strings.")

        try:
            start_hour = int(normalized_start[:2])
            start_minute = int(normalized_start[3:])
            end_hour = int(normalized_end[:2])
            end_minute = int(normalized_end[3:])
        except ValueError as exc:
            raise serializers.ValidationError(f"{label} start and end must be HH:MM strings.") from exc

        if not (0 <= start_hour <= 23 and 0 <= start_minute <= 59 and 0 <= end_hour <= 23 and 0 <= end_minute <= 59):
            raise serializers.ValidationError(f"{label} start and end must be HH:MM strings.")

        start_total = start_hour * 60 + start_minute
        end_total = end_hour * 60 + end_minute

        if start_total >= end_total:
            raise serializers.ValidationError(
                f"{label} end time must be later than start time. Split overnight hours across adjacent days."
            )

        if previous_end is not None and start_total < previous_end:
            raise serializers.ValidationError(f"{context_label} intervals must be sorted and non-overlapping.")

        previous_end = end_total
        normalized_intervals.append({"start": normalized_start, "end": normalized_end})

    return normalized_intervals


def validate_business_hours(value, timezone):
    normalized_timezone = validate_timezone(timezone)
    if value is None:
        return None

    if normalized_timezone is None:
        raise serializers.ValidationError("Business hours require a valid timezone.")

    if not isinstance(value, Mapping):
        raise serializers.ValidationError("Business hours must be an object.")

    value_keys = set(value.keys())
    if value_keys != {"open_by_week", "open_by_date"}:
        raise serializers.ValidationError("Business hours must only include open_by_week and open_by_date.")

    open_by_week = value.get("open_by_week")
    open_by_date = value.get("open_by_date")

    if not isinstance(open_by_week, Mapping):
        raise serializers.ValidationError("open_by_week must be an object keyed by weekday.")

    week_keys = set(open_by_week.keys())
    expected_week_keys = set(WEEKDAYS)
    if week_keys != expected_week_keys:
        raise serializers.ValidationError("open_by_week must include every weekday exactly once.")

    normalized_week = {
        day: _validate_interval_list(open_by_week[day], context_label=day.capitalize())
        for day in WEEKDAYS
    }

    if not isinstance(open_by_date, Mapping):
        raise serializers.ValidationError("open_by_date must be an object keyed by date.")

    if len(open_by_date) > MAX_OVERRIDE_DATES:
        raise serializers.ValidationError(f"open_by_date may not contain more than {MAX_OVERRIDE_DATES} dates.")

    normalized_dates = {}
    for raw_date, raw_intervals in sorted(open_by_date.items()):
        if not isinstance(raw_date, str):
            raise serializers.ValidationError("open_by_date keys must be YYYY-MM-DD strings.")

        try:
            normalized_date = date.fromisoformat(raw_date)
        except ValueError as exc:
            raise serializers.ValidationError("open_by_date keys must be valid YYYY-MM-DD dates.") from exc

        normalized_dates[normalized_date.isoformat()] = _validate_interval_list(
            raw_intervals,
            context_label=f"Override {normalized_date.isoformat()}",
        )

    return {
        "open_by_week": normalized_week,
        "open_by_date": normalized_dates,
    }
