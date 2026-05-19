const INVOICE_LIMIT = 5; // max invoices per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

type RateLimitRecord = {
  count: number;
  windowStart: number;
};

export function checkRateLimit(address: string): { allowed: boolean; remaining: number; resetIn: number } {
  const key = `rl_invoice_${address.toLowerCase()}`;
  const now = Date.now();

  try {
    const stored = localStorage.getItem(key);
    const record: RateLimitRecord = stored
      ? JSON.parse(stored)
      : { count: 0, windowStart: now };

    // Reset window if expired
    if (now - record.windowStart > WINDOW_MS) {
      const fresh: RateLimitRecord = { count: 0, windowStart: now };
      localStorage.setItem(key, JSON.stringify(fresh));
      return { allowed: true, remaining: INVOICE_LIMIT - 1, resetIn: WINDOW_MS };
    }

    if (record.count >= INVOICE_LIMIT) {
      const resetIn = WINDOW_MS - (now - record.windowStart);
      return { allowed: false, remaining: 0, resetIn };
    }

    // Increment
    record.count += 1;
    localStorage.setItem(key, JSON.stringify(record));
    return { allowed: true, remaining: INVOICE_LIMIT - record.count, resetIn: WINDOW_MS - (now - record.windowStart) };
  } catch {
    return { allowed: true, remaining: INVOICE_LIMIT, resetIn: WINDOW_MS };
  }
}

export function formatResetTime(ms: number): string {
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""}`;
  const hrs = Math.ceil(mins / 60);
  return `${hrs} hour${hrs > 1 ? "s" : ""}`;
}
