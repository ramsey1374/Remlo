// Strip HTML tags, trim whitespace, limit length
export function sanitizeText(input: string, maxLength = 100): string {
  return input
    .replace(/<[^>]*>/g, "")           // strip HTML
    .replace(/[<>'"]/g, "")            // strip dangerous chars
    .replace(/\s+/g, " ")              // collapse whitespace
    .trim()
    .slice(0, maxLength);
}

// Validate URL format
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Validate amount — positive number with max 2 decimals
export function sanitizeAmount(input: string): number | null {
  const num = parseFloat(input);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 100) / 100; // max 2 decimal places
}

// Sanitize display name
export function sanitizeDisplayName(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>'"]/g, "")
    .trim()
    .slice(0, 40);
}
