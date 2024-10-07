// File: /app/components/FlightCard.tsx

'use client';

import React from 'react';
import { toast } from 'react-toastify';

// Mapping of carrier codes to their respective logo URLs.
// You should populate this mapping with actual URLs of airline logos.
// For demonstration purposes, placeholder images are used.
const airlineLogos: { [key: string]: string } = {
  AA: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/American_Airlines_logo_2013.svg/512px-American_Airlines_logo_2013.svg.png',
  JL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Japan_Airlines_logo.svg/512px-Japan_Airlines_logo.svg.png',
  UA: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/United_Airlines_Logo.svg/512px-United_Airlines_Logo.svg.png',
  DL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Delta_Air_Lines_logo.svg/512px-Delta_Air_Lines_logo.svg.png',
  // Add more carrier codes and their logo URLs here
};

// Function to retrieve the airline logo based on carrier code
const getAirlineLogo = (carrierCode: string): string => {
  return airlineLogos[carrierCode.toUpperCase()] || 'https://via.placeholder.com/50'; // Placeholder image if logo not found
};

interface FlightCardProps {
  flight: Flight;
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

export default function FlightCard({ flight }: FlightCardProps) {
  const handleBook = () => {
    // Redirect to booking URL or handle booking logic
    // Since Amadeus may not provide direct booking URLs, you might need to handle this differently
    // For demonstration, we'll just show a toast notification
    toast.info('Booking functionality is not implemented yet.');
  };

  // Safeguard: Ensure airlines is an array
  const airlines = Array.isArray(flight.airlines) ? flight.airlines : [];

  return (
    <div className="flex flex-col md:flex-row bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden m-4 w-full max-w-4xl">
      {/* Left Section: Price and Airlines */}
      <div className="md:w-1/3 bg-green-500 flex flex-col justify-center items-center p-6">
        <h2 className="text-3xl font-bold text-white mb-2">${flight.price}</h2>
        <div className="flex items-center space-x-2">
          {airlines.length > 0 ? (
            airlines.map((carrierCode) => (
              <img
                key={carrierCode}
                src={getAirlineLogo(carrierCode)}
                alt={`${carrierCode} logo`}
                className="w-12 h-12 object-contain"
              />
            ))
          ) : (
            <span className="text-white">N/A</span>
          )}
        </div>
      </div>

      {/* Right Section: Itineraries and Details */}
      <div className="md:w-2/3 p-6">
        {flight.itineraries.map((itinerary, index) => (
          <ItineraryDetails key={index} itinerary={itinerary} />
        ))}

        <button
          onClick={handleBook}
          className="mt-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}

function ItineraryDetails({ itinerary }: { itinerary: Itinerary }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Departure: {formatDateTime(itinerary.departure_time)}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            From: {itinerary.segments[0]?.departureAirport || 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Arrival: {formatDateTime(itinerary.arrival_time)}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            To: {itinerary.segments[itinerary.segments.length - 1]?.arrivalAirport || 'N/A'}
          </p>
        </div>
      </div>
      <p className="text-gray-700 dark:text-gray-300 mt-2">
        Duration: {formatDuration(itinerary.duration)}
      </p>
      <p className="text-gray-700 dark:text-gray-300 mt-1">
        Segments:
        <ul className="list-disc list-inside mt-1">
          {itinerary.segments.map((segment, idx) => (
            <li key={idx}>
              <strong>
                {segment.carrierCode} {segment.flightNumber}
              </strong>
              : {segment.departureAirport} (
              {formatTime(segment.departureTime)}) → {segment.arrivalAirport} (
              {formatTime(segment.arrivalTime)})
            </li>
          ))}
        </ul>
      </p>
    </div>
  );
}

function formatDateTime(dateTime: string): string {
  if (!dateTime || dateTime === 'N/A') return 'N/A';
  const date = new Date(dateTime);
  return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
}

function formatTime(dateTime: string): string {
  if (!dateTime || dateTime === 'N/A') return 'N/A';
  const date = new Date(dateTime);
  return isNaN(date.getTime())
    ? 'N/A'
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(duration: string): string {
  if (!duration || duration === 'N/A') return 'N/A';
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?/;
  const matches = duration.match(regex);
  if (matches) {
    const hours = matches[1] ? `${matches[1]}h` : '';
    const minutes = matches[2] ? `${matches[2]}m` : '';
    return `${hours} ${minutes}`.trim();
  }
  return duration;
}
