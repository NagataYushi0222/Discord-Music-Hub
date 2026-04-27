export const MAX_REASON_LENGTH = 300;
export const MAX_TAGS = 12;
export const MAX_TAG_LENGTH = 24;
export const MAX_GENRE_LENGTH = 40;
export const MAX_TIMESTAMP_BODY_LENGTH = 160;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function validateReason(value: unknown): ValidationResult<string> {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: "Recommendation reason is required." };
  }

  const reason = value.trim();
  if (reason.length > MAX_REASON_LENGTH) {
    return {
      ok: false,
      error: `Recommendation reason must be ${MAX_REASON_LENGTH} characters or less.`,
    };
  }

  return { ok: true, value: reason };
}

export function validateVisibility(
  value: unknown,
): ValidationResult<"public" | "draft"> {
  if (value === undefined || value === null) {
    return { ok: true, value: "public" };
  }

  if (value === "public" || value === "draft") {
    return { ok: true, value };
  }

  return { ok: false, error: "Visibility must be public or draft." };
}

export function validateTags(value: unknown): ValidationResult<string[]> {
  if (value === undefined || value === null) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "Tags must be an array." };
  }

  if (value.length > MAX_TAGS) {
    return { ok: false, error: `Tags must be ${MAX_TAGS} items or less.` };
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, error: "Each tag must be a string." };
    }

    const tag = item.trim().replace(/^#+/, "");
    if (!tag) {
      return { ok: false, error: "Tags cannot be empty." };
    }

    if (tag.length > MAX_TAG_LENGTH) {
      return {
        ok: false,
        error: `Each tag must be ${MAX_TAG_LENGTH} characters or less.`,
      };
    }

    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) {
      return { ok: false, error: "Duplicate tags are not allowed." };
    }

    seen.add(key);
    tags.push(tag);
  }

  return { ok: true, value: tags };
}

export function validateGenre(value: unknown): ValidationResult<string> {
  if (value === undefined || value === null) {
    return { ok: true, value: "" };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "Genre must be a string." };
  }

  const genre = value.trim();
  if (genre.length > MAX_GENRE_LENGTH) {
    return {
      ok: false,
      error: `Genre must be ${MAX_GENRE_LENGTH} characters or less.`,
    };
  }

  return { ok: true, value: genre };
}

export function parseTimestampSeconds(value: string): number | null {
  const input = value.trim();
  if (!input || input.startsWith("-")) {
    return null;
  }

  const parts = input.split(":");
  if (parts.length > 3) {
    return null;
  }

  let seconds = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return null;
    }
    seconds = seconds * 60 + Number(part);
  }

  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

export function validateTimestamp(
  value: unknown,
): ValidationResult<{ time: string; body: string }> {
  if (
    !value ||
    typeof value !== "object" ||
    !("time" in value) ||
    !("body" in value)
  ) {
    return { ok: false, error: "Timestamp must include time and body." };
  }

  const raw = value as { time?: unknown; body?: unknown };
  if (typeof raw.time !== "string" || typeof raw.body !== "string") {
    return { ok: false, error: "Timestamp time and body must be strings." };
  }

  const time = raw.time.trim();
  const body = raw.body.trim();
  if (!time || !body) {
    return { ok: false, error: "Timestamp time and body are required." };
  }

  if (parseTimestampSeconds(time) === null) {
    return { ok: false, error: "Timestamp must be zero or greater." };
  }

  if (body.length > MAX_TIMESTAMP_BODY_LENGTH) {
    return {
      ok: false,
      error: `Timestamp body must be ${MAX_TIMESTAMP_BODY_LENGTH} characters or less.`,
    };
  }

  return { ok: true, value: { time, body } };
}

export function validateTimestamps(
  value: unknown,
): ValidationResult<{ time: string; body: string }[]> {
  if (value === undefined || value === null) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "Timestamps must be an array." };
  }

  const timestamps: { time: string; body: string }[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      "time" in item &&
      "body" in item
    ) {
      const raw = item as { time?: unknown; body?: unknown };
      if (
        typeof raw.time === "string" &&
        typeof raw.body === "string" &&
        !raw.time.trim() &&
        !raw.body.trim()
      ) {
        continue;
      }
    }

    const result = validateTimestamp(item);
    if (!result.ok) {
      return result;
    }
    timestamps.push(result.value);
  }

  return { ok: true, value: timestamps };
}
