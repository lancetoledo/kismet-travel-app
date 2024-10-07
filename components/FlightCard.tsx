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
      <div className="md:w-1/3 bg-green-500 flex flex-col justify-center items-center p-4">
        <h2 className="text-2xl font-bold text-white">Price: ${flight.price}</h2>
        <p className="text-white">
          Airlines: {airlines.length > 0 ? airlines.join(', ') : 'N/A'}
        </p>
      </div>
      <div className="md:w-2/3 p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          {flight.itineraries.map((itinerary, index) => (
            <ItineraryDetails key={index} itinerary={itinerary} />
          ))}
        </div>
        <button
          onClick={handleBook}
          className="mt-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}

function ItineraryDetails({ itinerary }: { itinerary: Itinerary }) {
  return (
    <div className="flex flex-col mb-4 md:mb-0">
      <h3 className="text-xl font-semibold">Itinerary</h3>
      <p>
        <strong>Departure:</strong> {formatDateTime(itinerary.departure_time)} -{' '}
        {itinerary.segments[0]?.departureAirport || 'N/A'}
      </p>
      <p>
        <strong>Arrival:</strong> {formatDateTime(itinerary.arrival_time)} -{' '}
        {itinerary.segments[itinerary.segments.length - 1]?.arrivalAirport || 'N/A'}
      </p>
      <p>
        <strong>Duration:</strong> {formatDuration(itinerary.duration)}
      </p>
      <p>
        <strong>Segments:</strong>
        <ul className="list-disc list-inside">
          {itinerary.segments.map((segment, idx) => (
            <li key={idx}>
              {segment.carrierCode} {segment.flightNumber}: {segment.departureAirport} (
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
  const date = new Date(dateTime);
  return date.toLocaleString();
}

function formatTime(dateTime: string): string {
  const date = new Date(dateTime);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(duration: string): string {
  // Duration is a string like "PT5H30M"
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?/;
  const matches = duration.match(regex);
  if (matches) {
    const hours = matches[1] ? `${matches[1]}h` : '';
    const minutes = matches[2] ? `${matches[2]}m` : '';
    return `${hours} ${minutes}`.trim();
  }
  return duration;
}
