import { validatePrzEmail } from "../lib/validators/email";

describe("validatePrzEmail", () => {
  // ── Valid addresses ──────────────────────────────────────────────────────

  it("accepts a standard index-only address", () => {
    expect(validatePrzEmail("123456@stud.prz.edu.pl")).toEqual({ valid: true });
  });

  it("accepts address with digits followed by letters", () => {
    expect(validatePrzEmail("123abc@stud.prz.edu.pl")).toEqual({ valid: true });
  });

  it("accepts address with digits followed by dots and hyphens", () => {
    expect(validatePrzEmail("123.456-7@stud.prz.edu.pl")).toEqual({
      valid: true,
    });
  });

  it("is case-insensitive for the domain part", () => {
    expect(validatePrzEmail("123456@STUD.PRZ.EDU.PL")).toEqual({ valid: true });
  });

  it("trims leading/trailing whitespace before validation", () => {
    expect(validatePrzEmail("  123456@stud.prz.edu.pl  ")).toEqual({
      valid: true,
    });
  });

  // ── Doctoral-student block ───────────────────────────────────────────────

  it("rejects address starting with lowercase 'd'", () => {
    const result = validatePrzEmail("d123456@stud.prz.edu.pl");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/doctoral/i);
  });

  it("rejects address starting with uppercase 'D'", () => {
    const result = validatePrzEmail("D123456@stud.prz.edu.pl");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/doctoral/i);
  });

  it("rejects 'd' followed only by letters (no digits)", () => {
    const result = validatePrzEmail("dabc@stud.prz.edu.pl");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/doctoral/i);
  });

  // ── Domain mismatches ────────────────────────────────────────────────────

  it("rejects wrong domain", () => {
    const result = validatePrzEmail("123456@prz.edu.pl");
    expect(result.valid).toBe(false);
  });

  it("rejects gmail address", () => {
    const result = validatePrzEmail("123456@gmail.com");
    expect(result.valid).toBe(false);
  });

  it("rejects university staff address", () => {
    const result = validatePrzEmail("jkowalski@prz.edu.pl");
    expect(result.valid).toBe(false);
  });

  // ── Local-part must start with digits ────────────────────────────────────

  it("rejects address starting with a non-digit letter other than 'd'", () => {
    const result = validatePrzEmail("abc123@stud.prz.edu.pl");
    expect(result.valid).toBe(false);
  });

  it("rejects address starting with an underscore", () => {
    const result = validatePrzEmail("_123@stud.prz.edu.pl");
    expect(result.valid).toBe(false);
  });

  // ── Empty / invalid inputs ───────────────────────────────────────────────

  it("rejects empty string", () => {
    const result = validatePrzEmail("");
    expect(result.valid).toBe(false);
  });

  it("rejects missing '@' sign", () => {
    const result = validatePrzEmail("123456stud.prz.edu.pl");
    expect(result.valid).toBe(false);
  });
});
