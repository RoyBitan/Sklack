/**
 * Normalizes Israeli phone numbers to a consistent format for database searches.
 * Strips all non-digit characters and standardizes the prefix.
 *
 * Examples:
 * 050-123-4567 -> 0501234567
 * +972 50-123-4567 -> 0501234567
 * 972501234567 -> 0501234567
 */
export const normalizePhone = (phone: string): string => {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, "");

  // Handle Israeli prefix 972
  if (cleaned.startsWith("972")) {
    cleaned = "0" + cleaned.slice(3);
  }

  // Basic length check for IL mobile (should be 10 digits starting with 05, or 9 for landlines)
  // For now, we just return the cleaned digits.
  return cleaned;
};

/**
 * Validates if the phone number is a potentially valid Israeli mobile number.
 */
export const isValidPhone = (phone: string): boolean => {
  const normalized = normalizePhone(phone);
  // Typical IL mobile: 05X-XXXXXXX (10 digits)
  return /^05\d{8}$/.test(normalized) || /^0\d{8}$/.test(normalized);
};

/**
 * Formats phone number for display as XXX-XXX-XXXX
 */
export const formatPhoneDisplay = (phone: string): string => {
  if (!phone) return "";
  const normalized = normalizePhone(phone);

  // Format as XXX-XXX-XXXX
  if (normalized.length === 10) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${
      normalized.slice(6)
    }`;
  }

  return phone; // Return original if not standard format
};

/**
 * Formats phone number as the user types (Input Masking)
 * Handles input like 0501234567 -> 050-123-4567
 */
export const formatPhoneNumberInput = (value: string): string => {
  if (!value) return value;

  // Clean non-digits
  const digits = value.replace(/\D/g, "");

  // If it starts with 972, normalize it first for display
  let phone = digits;
  if (phone.startsWith("972")) {
    phone = "0" + phone.slice(3);
  }

  // Israeli mobile format: 05X-XXX-XXXX
  if (phone.length < 4) return phone;
  if (phone.length < 7) {
    return `${phone.slice(0, 3)}-${phone.slice(3)}`;
  }
  return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6, 10)}`;
};
