/**
 * PRZ (Politechnika Rzeszowska) e-mail validator.
 *
 * Accepted format: <indexNumber>@stud.prz.edu.pl
 *
 * Rules:
 *  - The local part (before @) must START with one or more decimal digits.
 *  - It may be followed by additional alphanumeric characters / dots / hyphens
 *    (e.g. student login styles used by the university).
 *  - The prefix "d" (lowercase or uppercase), which is reserved for doctoral
 *    students (doktoranci), is COMPLETELY BLOCKED – any address whose local
 *    part begins with the letter "d" is rejected.
 *  - The domain must be exactly "stud.prz.edu.pl" (case-insensitive).
 */

/**
 * Regex breakdown:
 *  ^           – start of string
 *  \d+         – one or more digits (index number prefix, blocks "d…" prefix)
 *  [a-z0-9._-]* – optional alphanumeric / separator chars after the digits
 *  @stud\.prz\.edu\.pl – literal domain (escaped dots)
 *  $           – end of string
 */
const PRZ_EMAIL_REGEX = /^\d+[a-z0-9._-]*@stud\.prz\.edu\.pl$/i;

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates an e-mail address against PRZ student address rules.
 *
 * @param email - The raw e-mail string to validate.
 * @returns `{ valid: true }` on success or `{ valid: false, reason: string }` on failure.
 */
export function validatePrzEmail(email: string): ValidationResult {
  if (!email || typeof email !== "string") {
    return { valid: false, reason: "Email must be a non-empty string." };
  }

  const normalised = email.trim().toLowerCase();

  // Explicit check for doctoral-student prefix (starts with 'd') before
  // running the full regex so we can return a specific error message.
  const localPart = normalised.split("@")[0];
  if (localPart.startsWith("d")) {
    return {
      valid: false,
      reason:
        "Doctoral-student addresses (prefix 'd') are not permitted on this platform.",
    };
  }

  if (!PRZ_EMAIL_REGEX.test(normalised)) {
    return {
      valid: false,
      reason:
        "Email must match the format <indexNumber>@stud.prz.edu.pl and start with digits.",
    };
  }

  return { valid: true };
}
