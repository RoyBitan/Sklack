import { describe, expect, it } from "vitest";
import {
  cleanLicensePlate,
  formatLicensePlate,
  sanitize,
} from "@/utils/formatters";

describe("formatters utils", () => {
  describe("cleanLicensePlate", () => {
    it("should remove non-digit characters", () => {
      expect(cleanLicensePlate("12-345-67")).toBe("1234567");
      expect(cleanLicensePlate("ABC-123")).toBe("123");
    });
  });

  describe("formatLicensePlate", () => {
    it("should format 7-digit plates correctly", () => {
      expect(formatLicensePlate("1234567")).toBe("12-345-67");
    });

    it("should format 8-digit plates correctly", () => {
      expect(formatLicensePlate("12345678")).toBe("123-45-678");
    });

    it("should return the same string if it's not 7 or 8 digits", () => {
      expect(formatLicensePlate("123456")).toBe("123456");
    });
  });

  describe("sanitize", () => {
    it("should trim strings", () => {
      expect(sanitize("  hello  ")).toBe("hello");
    });

    it("should return empty string for null/undefined", () => {
      expect(sanitize(null)).toBe("");
      expect(sanitize(undefined)).toBe("");
    });
  });
});
