const PACIFIC_TIME_ZONE = "America/Los_Angeles";
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const HAS_TIMEZONE_RE = /(Z|[+-]\d{2}:\d{2})$/i;

export function parseCalendarDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeCalendarDateTime(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  let candidate = trimmed;
  if (DATE_ONLY_RE.test(trimmed)) {
    candidate = `${trimmed}T00:00:00Z`;
  } else if (!HAS_TIMEZONE_RE.test(trimmed)) {
    candidate = `${trimmed}Z`;
  }

  return parseCalendarDate(candidate)?.toISOString() ?? null;
}

export function toPacificDate(value: string | null | undefined): Date | null {
  const parsed = parseCalendarDate(value);
  if (!parsed) {
    return null;
  }

  return parseCalendarDate(
    parsed.toLocaleString("en-US", { timeZone: PACIFIC_TIME_ZONE })
  );
}
