import type { BusinessHours, BusinessHoursInterval, Weekday } from "@/types/company";

export const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export function createEmptyBusinessHours(): BusinessHours {
  return {
    open_by_week: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    },
    open_by_date: {},
  };
}

export function cloneBusinessHours(value: BusinessHours | null): BusinessHours | null {
  if (!value) {
    return null;
  }

  return {
    open_by_week: WEEKDAYS.reduce(
      (accumulator, day) => ({
        ...accumulator,
        [day]: (value.open_by_week[day] ?? []).map((interval) => ({ ...interval })),
      }),
      {} as Record<Weekday, BusinessHoursInterval[]>
    ),
    open_by_date: Object.fromEntries(
      Object.entries(value.open_by_date).map(([date, intervals]) => [
        date,
        intervals.map((interval) => ({ ...interval })),
      ])
    ),
  };
}

export function formatHoursRange(start: string, end: string) {
  return `${formatHoursTime(start)} - ${formatHoursTime(end)}`;
}

export function formatHoursTime(value: string) {
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}
