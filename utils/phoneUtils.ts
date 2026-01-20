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
    let cleaned = phone.replace(/\D/g, '');

    // Handle Israeli prefix 972
    if (cleaned.startsWith('972')) {
        cleaned = '0' + cleaned.slice(3);
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
