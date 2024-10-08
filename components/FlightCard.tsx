// File: /app/components/FlightCard.tsx

'use client';

import React from 'react';
import { toast } from 'react-toastify';
import { PaperAirplaneIcon } from '@heroicons/react/solid'; // Import Heroicons

interface FlightCardProps {
  flight: Flight;
}

interface Flight {
  id: string;
  price: number;
  itineraries: Itinerary[]; // itineraries[0] = outbound, itineraries[1] = return
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
  logoUrl: string;
}

export default function FlightCard({ flight }: FlightCardProps) {
  const handleBook = () => {
    // Implement booking logic or redirect
    toast.info('Booking functionality is not implemented yet.');
  };

  // Extract outbound and return itineraries
  const outboundItinerary = flight.itineraries[0];
  const returnItinerary = flight.itineraries[1];

  return (
    <div className="flex flex-col md:flex-row bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden m-4 w-full max-w-8xl">
      {/* Left Section: Flight Details */}
      <div className="flex flex-col flex-grow p-6">
        {/* Outbound Itinerary */}
        <FlightItinerary itinerary={outboundItinerary} title="Outbound" />

        {/* Separator */}
        {returnItinerary && (
          <hr className="my-6 border-gray-300 dark:border-gray-600" />
        )}

        {/* Return Itinerary */}
        {returnItinerary && (
          <FlightItinerary itinerary={returnItinerary} title="Return" />
        )}
      </div>

      {/* Right Section: Price and Book Button */}
      <div className="flex flex-col justify-center items-center bg-gray-100 dark:bg-gray-700 p-6 md:w-1/3">
        {/* Price */}
        <span className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          ${flight.price.toFixed(2)}
        </span>
        {/* Book Button */}
        <button
          onClick={handleBook}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-full transition-colors duration-200"
        >
          Book
        </button>
      </div>
    </div>
  );
}

interface FlightItineraryProps {
  itinerary: Itinerary;
  title: string;
}

function FlightItinerary({ itinerary, title }: FlightItineraryProps) {
  const segments = itinerary.segments;

  // Get the first segment for departure details
  const firstSegment = segments[0];
  // Get the last segment for arrival details
  const lastSegment = segments[segments.length - 1];

  // Determine if the flight is direct
  const isDirect = segments.length === 1;

  // Get the carrier logo from the first segment
  const carrierLogo = firstSegment.logoUrl || 'https://via.placeholder.com/50';

  // If not direct, get the stopover airport code
  const stopoverAirportCode =
    !isDirect && segments.length > 1 ? segments[0].arrivalAirport : '';

  return (
    <div className="flex flex-col">
      {/* Title */}
      <span className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
        {title}
      </span>

      {/* Itinerary Details */}
      <div className="flex items-center">
        {/* Carrier Logo */}
        <div className="flex-shrink-0">
          <img
            src={carrierLogo}
            alt={`${firstSegment.carrierCode} logo`}
            className="w-16 h-16 object-contain"
          />
        </div>

        {/* Departure Details */}
        <div className="flex flex-col items-center mx-6">
          <span className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {formatTime(firstSegment.departureTime)}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {firstSegment.departureAirport}
          </span>
        </div>

        {/* Flight Duration and Line */}
        <div className="relative flex flex-col items-center flex-grow mx-6">
          {/* Line and Icons */}
          <div className="relative w-full flex items-center">
            {/* Continuous Line */}
            <div className="w-full h-px bg-gray-400"></div>

            {/* Black Dot for Stop */}
            {!isDirect && (
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <div className="w-3 h-3 bg-black rounded-full"></div>
              </div>
            )}

            {/* Plane Icon */}
            <div className="absolute right-0 transform translate-x-1/2">
              <PaperAirplaneIcon className="h-6 w-6 text-gray-500 rotate-90" />
            </div>
          </div>

          {/* Flight Information */}
          <div className="mt-2 text-center">
            {isDirect ? (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Direct
              </span>
            ) : (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {segments.length - 1} stop{' '}
                {stopoverAirportCode && `${stopoverAirportCode}`}
              </span>
            )}
          </div>
        </div>

        {/* Arrival Details */}
        <div className="flex flex-col items-center mx-6">
          <span className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {formatTime(lastSegment.arrivalTime)}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {lastSegment.arrivalAirport}
          </span>
        </div>
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
