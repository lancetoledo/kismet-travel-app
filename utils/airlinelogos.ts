// File: /utils/airlineLogos.ts

import axios from 'axios';
import airlineLogos from './airlineLogos.json'; // Import the local mapping

// Interface for Airline Logo Response
interface AirlineLogoResponse {
  carrierCode: string;
  logoUrl: string;
}

// In-memory cache for carrierCode to logoUrl mapping
const logoCache: Map<string, string> = new Map();

/**
 * Function to fetch airline logo.
 * It first tries to fetch from the Aviationstack API.
 * If unsuccessful, it falls back to the local airlineLogos.json.
 * If still not found, it uses a placeholder image.
 * @param carrierCode - The IATA carrier code.
 * @returns The URL of the airline logo.
 */
export async function getAirlineLogo(carrierCode: string): Promise<string> {
  carrierCode = carrierCode.toUpperCase();

  // Check if logo is already cached
  if (logoCache.has(carrierCode)) {
    return logoCache.get(carrierCode)!;
  }

  // Attempt to fetch from Aviationstack API
  try {
    const apiKey = process.env.AVIATIONSTACK_API_KEY;
    if (!apiKey) {
      console.error('ERROR: Aviationstack API key is not set.');
      throw new Error('Missing Aviationstack API key.');
    }

    // Fetch airline information from Aviationstack
    const response = await axios.get<{
      data: Array<{
        carrier_iata: string;
        logo: string | null;
      }>;
    }>('https://api.aviationstack.com/v1/airlines', { // Use HTTPS
      params: {
        access_key: apiKey,
        carrier_iata: carrierCode,
      },
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      const airlineData = response.data.data[0];
      const logoUrl = airlineData.logo || null;

      if (logoUrl) {
        // Cache and return the logo URL
        logoCache.set(carrierCode, logoUrl);
        return logoUrl;
      } else {
        console.warn(`WARNING: No logo found via API for carrier code: ${carrierCode}`);
      }
    } else {
      console.warn(`WARNING: No airline data found via API for carrier code: ${carrierCode}`);
    }
  } catch (error) {
    console.error(`ERROR: Failed to fetch logo from Aviationstack API for carrier code: ${carrierCode}`, error);
  }

  // Fallback to local mapping
  const localLogoUrl = airlineLogos[carrierCode];
  if (localLogoUrl) {
    logoCache.set(carrierCode, localLogoUrl);
    return localLogoUrl;
  }

  // Final fallback to placeholder image
  console.warn(`WARNING: No logo found for carrier code: ${carrierCode}. Using placeholder.`);
  const placeholder = 'https://via.placeholder.com/50';
  logoCache.set(carrierCode, placeholder);
  return placeholder;
}
