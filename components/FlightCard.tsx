// File: /app/components/FlightCard.tsx

'use client';

import React from 'react';
import { toast } from 'react-toastify';

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
  logoUrl: string; // Logo URL included
}

export default function FlightCard({ flight }: FlightCardProps) {
  const handleBook = () => {
    // Implement booking logic or redirect
    toast.info('Booking functionality is not implemented yet.');
  };

  // For simplicity, we'll display only the first itinerary
  const itinerary = flight.itineraries[0];
  const segments = itinerary.segments;

  // Get the first segment for departure details
  const firstSegment = segments[0];
  // Get the last segment for arrival details
  const lastSegment = segments[segments.length - 1];

  // Determine if the flight is direct
  const isDirect = segments.length === 1;

  // Get the carrier logo from the first segment
  const carrierLogo = firstSegment.logoUrl || 'https://via.placeholder.com/50';

  return (
    <div className="flex flex-col md:flex-row bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden m-4 w-full max-w-4xl">
      {/* Left Section */}
      <div className="flex flex-col md:flex-row items-center md:items-stretch flex-grow p-4">
        {/* Carrier Logo */}
        <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-4">
          <img
            src={carrierLogo}
            alt={`${firstSegment.carrierCode} logo`}
            className="w-12 h-12 object-contain"
          />
        </div>

        {/* Flight Details */}
        <div className="flex flex-col md:flex-row md:items-center flex-grow">
          {/* Departure */}
          <div className="flex flex-col items-center md:items-start md:w-1/3">
            <span className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {formatTime(firstSegment.departureTime)}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {firstSegment.departureAirport}
            </span>
          </div>

          {/* Flight Duration and Line */}
          <div className="flex flex-col items-center md:w-1/3">
            <span className="text-gray-600 dark:text-gray-400">
              {formatDuration(itinerary.duration)}
            </span>
            <div className="flex items-center mt-2 mb-2 w-full">
              <div className="h-px bg-gray-400 flex-grow"></div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-500 mx-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                transform="rotate(90)"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18l-6 6m0 0l-6-6m6 6V4"
                />
              </svg>
              <div className="h-px bg-gray-400 flex-grow"></div>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isDirect ? 'Direct' : `${segments.length - 1} stop(s)`}
            </span>
          </div>

          {/* Arrival */}
          <div className="flex flex-col items-center md:items-end md:w-1/3">
            <span className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {formatTime(lastSegment.arrivalTime)}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {lastSegment.arrivalAirport}
            </span>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex flex-col justify-center items-center bg-gray-100 dark:bg-gray-700 p-4 md:w-1/3">
        {/* Price */}
        <span className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          ${flight.price.toFixed(2)}
        </span>
        {/* Book Button */}
        <button
          onClick={handleBook}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded transition-colors duration-200"
        >
          Book
        </button>
      </div>
    </div>
  );
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
