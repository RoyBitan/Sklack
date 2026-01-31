// Israeli Government Vehicle Registry API Service
// Data source: data.gov.il

const API_BASE_URL = "https://data.gov.il/api/3/action/datastore_search";
const RESOURCE_ID = "053cea08-09bc-40ec-8f7a-156f0677aff3";

export interface VehicleApiData {
  make: string; // tozeret_nm
  model: string; // kinuy_mishari
  year: string; // shnat_yitzur
  vin: string; // misgeret
  color: string; // tzeva_rechev
  fuelType: string; // sug_delek_nm
  engineModel: string; // degem_manoa
  registrationValidUntil: string; // tokef_dt
}

interface GovApiResponse {
  success: boolean;
  result: {
    records: Array<{
      mispar_rechev: string; // License plate
      tozeret_nm: string; // Make
      kinuy_mishari: string; // Model
      shnat_yitzur: number; // Year
      misgeret: string; // VIN
      tzeva_rechev: string; // Color
      sug_delek_nm: string; // Fuel type
      degem_manoa: string; // Engine model
      tokef_dt: string; // Registration validity
    }>;
  };
}

/**
 * Fetch vehicle data from Israeli government database
 * @param licensePlate - Israeli license plate number (digits only)
 * @returns Vehicle data or null if not found
 */
export async function fetchVehicleDataFromGov(
  licensePlate: string,
): Promise<VehicleApiData | null> {
  try {
    // Clean the license plate (remove dashes, spaces)
    const cleanPlate = licensePlate.replace(/[-\s]/g, "");

    if (!cleanPlate || cleanPlate.length < 6) {
      throw new Error("מספר רישוי לא תקין");
    }

    // Build API URL
    const url = `${API_BASE_URL}?resource_id=${RESOURCE_ID}&q=${cleanPlate}`;

    console.log("Fetching vehicle data from:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data: GovApiResponse = await response.json();

    if (!data.success || !data.result?.records?.length) {
      console.warn("No vehicle data found for plate:", cleanPlate);
      return null;
    }

    // Get the first matching record
    const record = data.result.records[0];

    // Map government API fields to our app fields
    const vehicleData: VehicleApiData = {
      make: record.tozeret_nm || "",
      model: record.kinuy_mishari || "",
      year: record.shnat_yitzur?.toString() || "",
      vin: record.misgeret || "",
      color: record.tzeva_rechev || "",
      fuelType: record.sug_delek_nm || "",
      engineModel: record.degem_manoa || "",
      registrationValidUntil: record.tokef_dt || "",
    };

    console.log("Successfully fetched vehicle data:", vehicleData);

    return vehicleData;
  } catch (error) {
    console.error("Error fetching vehicle data:", error);
    const message = error instanceof Error
      ? error.message
      : "שגיאה בטעינת נתוני הרכב";
    throw new Error(message);
  }
}

/**
 * Format Israeli license plate for display (e.g., "12-345-67")
 */
export function formatLicensePlateForDisplay(plate: string): string {
  if (!plate) return "";

  const clean = plate.replace(/[-\s]/g, "");

  // Format based on length
  if (clean.length === 7) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5)}`;
  } else if (clean.length === 8) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5)}`;
  }

  return clean;
}

/**
 * Validate Israeli license plate format
 */
export function isValidIsraeliPlate(plate: string): boolean {
  const clean = plate.replace(/[-\s]/g, "");
  // Israeli plates are typically 7-8 digits
  return /^\d{7,8}$/.test(clean);
}
