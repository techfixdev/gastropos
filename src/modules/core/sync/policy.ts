"use client";

const TERMINAL_ERROR_PATTERNS = [
  "violates foreign key constraint",
  "violates row-level security policy",
  "new row violates row-level security policy",
  "invalid input syntax for type uuid",
  "permission denied",
  "jwt",
  "not authenticated",
  "auth session missing",
];

export function isTerminalSyncError(errorMessage: string | null | undefined): boolean {
  if (!errorMessage) return false;
  const normalized = errorMessage.toLowerCase();
  return TERMINAL_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function shouldRetryNow(params: {
  attempts: number;
  lastAttemptAt: string | null;
  baseDelayMs: number;
  maxDelayMs: number;
}): boolean {
  const { attempts, lastAttemptAt, baseDelayMs, maxDelayMs } = params;
  if (attempts <= 0 || !lastAttemptAt) return true;

  const lastAttemptTs = new Date(lastAttemptAt).getTime();
  if (Number.isNaN(lastAttemptTs)) return true;

  const waitMs = Math.min(baseDelayMs * 2 ** (attempts - 1), maxDelayMs);
  return Date.now() - lastAttemptTs >= waitMs;
}

