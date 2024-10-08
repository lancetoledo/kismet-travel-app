// File: /app/components/FlightCard.tsx

'use client';

import React from 'react';
import { toast } from 'react-toastify';

// Mapping of carrier codes to their respective logo URLs.
// Populate this mapping with actual URLs of airline logos.
const airlineLogos: { [key: string]: string } = {
  AA: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/American_Airlines_logo_2013.svg/512px-American_Airlines_logo_2013.svg.png',
  JL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Japan_Airlines_logo.svg/512px-Japan_Airlines_logo.svg.png',
  UA: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/United_Airlines_Logo.svg/512px-United_Airlines_Logo.svg.png',
  DL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Delta_Air_Lines_logo.svg/512px-Delta_Air_Lines_logo.svg.png',
  NK: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Northwest_Airlines_logo.svg/512px-Northwest_Airlines_logo.svg.png',
  // Add more carrier codes and their logo URLs here
};

// Function to retrieve the airline logo based on carrier code
const getAirlineLogo = (carrierCode: string): string => {
  return airlineLogos[carrierCode.toUpperCase()] || 'https://via.placeholder.com/50'; // Placeholder image if logo not found
};

// Icons as SVG components
const DepartureIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-gray-500 dark:text-gray-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H3" />
  </svg>
);

const ArrivalIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-gray-500 dark:text-gray-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8l-4 4m0 0l4 4m-4-4h18" />
  </svg>
);

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
    <div className="flex flex-col bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden m-4 w-full max-w-4xl">
      {/* Header: Airline Logos and Price */}
      <div className="flex items-center justify-between p-4 bg-green-500">
        {/* Airline Logos */}
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
        {/* Price */}
        <div>
          <span className="text-2xl font-bold text-white">${flight.price.toFixed(2)}</span>
        </div>
      </div>

      {/* Body: Flight Details */}
      <div className="p-4">
        {flight.itineraries.map((itinerary, index) => (
          <ItineraryDetails key={index} itinerary={itinerary} />
        ))}
      </div>

      {/* Footer: Book Button */}
      <div className="p-4 bg-gray-100 dark:bg-gray-700">
        <button
          onClick={handleBook}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}

function ItineraryDetails({ itinerary }: { itinerary: Itinerary }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {/* Departure Details */}
        <div className="flex items-center space-x-2">
          <DepartureIcon />
          <div>
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {formatTime(itinerary.departure_time)}
            </p>
            <p className="text-gray-600 dark:text-gray-400">{itinerary.departureAirport}</p>
          </div>
        </div>

        {/* Arrow Icon */}
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-500 dark:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>

        {/* Arrival Details */}
        <div className="flex items-center space-x-2">
          <ArrivalIcon />
          <div>
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {formatTime(itinerary.arrival_time)}
            </p>
            <p className="text-gray-600 dark:text-gray-400">{itinerary.arrivalAirport}</p>
          </div>
        </div>
      </div>

      {/* Flight Duration and Stops */}
      <div className="flex items-center justify-between mt-4">
        {/* Duration */}
        <div className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500 dark:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-gray-700 dark:text-gray-300">{formatDuration(itinerary.duration)}</span>
        </div>

        {/* Stops */}
        <div className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500 dark:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m-4 4v12" />
          </svg>
          <span className="text-gray-700 dark:text-gray-300">Direct</span>
        </div>
      </div>

      {/* Flight Segments */}
      <div className="mt-4">
        <p className="text-gray-700 dark:text-gray-300 mb-2">Segments:</p>
        <ul className="list-disc list-inside space-y-2">
          {itinerary.segments.map((segment, idx) => (
            <li key={idx} className="flex items-center space-x-2">
              {/* Airline Logo */}
              <img
                src={airlineLogos[segment.carrierCode.toUpperCase()] || 'https://via.placeholder.com/30'}
                alt={`${segment.carrierCode} logo`}
                className="w-6 h-6 object-contain"
              />
              {/* Flight Details */}
              <span className="text-gray-700 dark:text-gray-300">
                {segment.carrierCode} {segment.flightNumber}: {segment.departureAirport} (
                {formatTime(segment.departureTime)}) → {segment.arrivalAirport} (
                {formatTime(segment.arrivalTime)})
              </span>
            </li>
          ))}
        </ul>
      </div>
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
