/**
 * Sanitize user input for safe rendering in the DOM.
 * Strips HTML tags and limits length.
 */
export function sanitizeText(input: string, maxLength = 200): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[&<>"']/g, "") // strip HTML entities
    .trim()
    .slice(0, maxLength);
}

export function sanitizeTableCode(input: string): string {
  return input.replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 20);
}

export function sanitizeDocumentNumber(input: string): string {
  return input.replace(/[^0-9\-]/g, "").slice(0, 30);
}
