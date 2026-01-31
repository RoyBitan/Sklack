export const cleanLicensePlate = (plate: string): string => {
  return plate.replace(/\D/g, "");
};

export const formatLicensePlate = (plate: string): string => {
  const cleaned = cleanLicensePlate(plate);

  if (cleaned.length === 7) {
    // 12-345-67
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
  }

  if (cleaned.length === 8) {
    // 123-45-678
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  }

  return cleaned;
};

export const sanitize = (val: string | null | undefined): string => {
  if (!val) return "";
  return val.trim();
};

/**
 * Sanitizes input for use in database search queries (LIKE, .or(), etc)
 * to prevent wildcard injections or broken syntax.
 */
export const sanitizeForSearch = (val: string | null | undefined): string => {
  if (!val) return "";
  // Strip characters that have special meaning in LIKE (% _)
  // or in Supabase .or() filter strings ( , () ).
  return val.trim().replace(/[%_\\(),|]/g, "");
};
