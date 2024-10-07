// File: /pages/api/flights/search.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface FlightSearchResponse {
  flights: Flight[];
}

interface Flight {
  id: string;
  price: number;
  itineraries: Itinerary[];
  airlines: string[];
  booking_token: string;
}

interface Itinerary {
  departure_time: string;
  arrival_time: string;
  duration: string;
  segments: Segment[];
}

interface Segment {
  carrierCode: string;
  flightNumber: string;
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FlightSearchResponse | { error: string }>
) {
  console.log('DEBUG: Incoming Request Method:', req.method);

  if (req.method !== 'POST') {
    console.log('DEBUG: Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { origin, destination, departDate, returnDate, passengers } = req.body;

  console.log('DEBUG: Request Body:', req.body);

  if (!origin || !destination || !departDate) {
    console.log('DEBUG: Missing required fields');
    return res.status(400).json({ error: 'Missing required fields: origin, destination, and departDate are required.' });
  }

  try {
    // Validate Environment Variables
    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

    console.log('DEBUG: Amadeus Client ID:', clientId ? 'Present' : 'Missing');
    console.log('DEBUG: Amadeus Client Secret:', clientSecret ? 'Present' : 'Missing');

    if (!clientId || !clientSecret) {
      console.error('ERROR: Amadeus API credentials are not set.');
      return res.status(500).json({ error: 'Server configuration error: Missing Amadeus API credentials.' });
    }

    // Authenticate with Amadeus API
    console.log('DEBUG: Authenticating with Amadeus API...');
    const authResponse = await axios.post(
      'https://test.api.amadeus.com/v1/security/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log('DEBUG: Authentication Response Status:', authResponse.status);
    console.log('DEBUG: Access Token:', authResponse.data.access_token ? 'Received' : 'Missing');

    const accessToken = authResponse.data.access_token;

    if (!accessToken) {
      console.error('ERROR: Failed to retrieve access token from Amadeus API.');
      return res.status(500).json({ error: 'Authentication failed: Unable to retrieve access token.' });
    }

    // Search for flight offers
    console.log('DEBUG: Searching for flight offers...');
    const flightResponse = await axios.get(
      'https://test.api.amadeus.com/v2/shopping/flight-offers',
      {
        params: {
          originLocationCode: origin,
          destinationLocationCode: destination,
          departureDate: departDate,
          returnDate: returnDate || undefined,
          adults: passengers || 1,
          currencyCode: 'USD',
          max: 10,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log('DEBUG: Flight Search Response Status:', flightResponse.status);
    console.log('DEBUG: Number of Flights Found:', flightResponse.data.data.length);

    // Check if flights are returned
    if (!flightResponse.data.data || flightResponse.data.data.length === 0) {
      console.log('DEBUG: No flights found for the given criteria.');
      return res.status(200).json({ flights: [] });
    }

    // Map the response to our Flight interface
    const flights: Flight[] = flightResponse.data.data.map((offer: any, offerIndex: number) => {
      console.log(`DEBUG: Processing offer ${offerIndex + 1}:`, offer.id);

      // Extract unique airlines from all segments
      const airlinesSet = new Set<string>();
      offer.itineraries.forEach((itinerary: any, itineraryIndex: number) => {
        console.log(`DEBUG: Processing itinerary ${itineraryIndex + 1}`);
        if (itinerary.segments && Array.isArray(itinerary.segments)) {
          itinerary.segments.forEach((segment: any, segmentIndex: number) => {
            if (segment.carrierCode) {
              airlinesSet.add(segment.carrierCode);
            } else {
              console.warn(`WARNING: Missing carrierCode in segment ${segmentIndex + 1} of itinerary ${itineraryIndex + 1}`);
            }
          });
        } else {
          console.warn(`WARNING: Missing or invalid segments in itinerary ${itineraryIndex + 1}`);
        }
      });

      // Map itineraries and segments
      const itineraries: Itinerary[] = offer.itineraries.map((itinerary: any, itineraryIndex: number) => {
        if (!itinerary.departure || !itinerary.departure.at) {
          console.warn(`WARNING: Missing departure.at in itinerary ${itineraryIndex + 1}`);
        }
        if (!itinerary.arrival || !itinerary.arrival.at) {
          console.warn(`WARNING: Missing arrival.at in itinerary ${itineraryIndex + 1}`);
        }
        return {
          departure_time: itinerary.departure?.at || 'N/A',
          arrival_time: itinerary.arrival?.at || 'N/A',
          duration: itinerary.duration || 'N/A',
          segments: itinerary.segments?.map((segment: any, segmentIndex: number) => ({
            carrierCode: segment.carrierCode || 'N/A',
            flightNumber: segment.flightNumber || 'N/A',
            departureAirport: segment.departure?.iataCode || 'N/A',
            departureTime: segment.departure?.at || 'N/A',
            arrivalAirport: segment.arrival?.iataCode || 'N/A',
            arrivalTime: segment.arrival?.at || 'N/A',
          })) || [],
        };
      });

      return {
        id: offer.id,
        price: offer.price.total,
        itineraries,
        airlines: Array.from(airlinesSet),
        booking_token: offer.booking_token || 'N/A',
      };
    });

    console.log('DEBUG: Mapped Flights:', flights);

    return res.status(200).json({ flights });
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('ERROR: Axios Error:', error.response?.data || error.message);
      return res.status(500).json({ error: 'Failed to fetch flight data from Amadeus API.' });
    } else {
      console.error('ERROR: Unexpected Error:', error);
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
}
