// File: /app/components/Banner.tsx

'use client';

import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

interface BannerProps {
  onSearch: (flights: Flight[]) => void;
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

export default function Banner({ onSearch }: BannerProps) {
  const [origin, setOrigin] = useState('EWR'); // IATA code for Newark Airport
  const [destination, setDestination] = useState('HND'); // IATA code for Haneda Airport
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    console.log('DEBUG: Initiating flight search...');
    if (!origin || !destination || !departDate) {
      console.log('DEBUG: Missing required fields.');
      toast.error('Please fill in origin, destination, and departure date.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        origin,
        destination,
        departDate,
        returnDate,
        passengers,
      };

      console.log('DEBUG: Sending search request with payload:', payload);

      const response = await axios.post('/api/flights/search', payload);

      console.log('DEBUG: Received response:', response.data);

      if (response.data.flights.length === 0) {
        console.log('DEBUG: No flights found.');
        toast.info('No flights found for the selected criteria.');
      } else {
        onSearch(response.data.flights);
        toast.success(`Found ${response.data.flights.length} flights!`);
      }
    } catch (error: any) {
      console.error('ERROR: Flight search failed:', error.response?.data || error.message);
      toast.error('Failed to search for flights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-auto bg-[#78c678] rounded-2xl p-8 gap-6">
      <div className="w-full">
        <h1 className="text-4xl text-white font-semibold pr-4 leading-none">
          Explore New Places
        </h1>
        <p className="text-xl text-white">Find cheap flights to your dream destinations</p>
      </div>
      <div className="w-full">
        <div className="flex">
          <div className="bg-neutral-900 text-white w-24 h-12 flex justify-center items-center rounded-t-xl font-semibold">
            Flights
          </div>
        </div>
        <div className="flex flex-wrap gap-4 p-4 bg-white rounded-b-xl rounded-tr-xl">
          <InputContainer
            icon="✈️"
            title="Origin (IATA)"
            value={origin}
            onChange={setOrigin}
            placeholder="EWR"
          />
          <InputContainer
            icon="🌍"
            title="Destination (IATA)"
            value={destination}
            onChange={setDestination}
            placeholder="HND"
          />
          <DateContainer
            title="Depart"
            value={departDate}
            onChange={setDepartDate}
          />
          <DateContainer
            title="Return"
            value={returnDate}
            onChange={setReturnDate}
          />
          <PassengerContainer
            passengers={passengers}
            onChange={setPassengers}
          />
          <div className="flex justify-center items-center w-40">
            <button
              onClick={handleSearch}
              className="bg-orange-500 w-full h-12 flex justify-center items-center text-lg text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputContainer({
  icon,
  title,
  value,
  onChange,
  placeholder,
}: {
  icon: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center justify-center w-40 gap-2 p-2">
      <span className="w-6 h-6 opacity-75">{icon}</span>
      <div className="flex flex-col border-r-2 border-stone-200 w-full">
        <span className="text-xs text-gray-500">{title}</span>
        <input
          type="text"
          className="outline-none w-full h-6 bg-transparent text-black"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function DateContainer({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center w-40">
      <span className="text-xs text-gray-500">{title}</span>
      <input
        type="date"
        className="outline-none w-full h-8 bg-transparent text-black"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function PassengerContainer({
  passengers,
  onChange,
}: {
  passengers: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center w-40">
      <span className="text-xs text-gray-500">Passengers/Class</span>
      <input
        type="number"
        min="1"
        max="10"
        className="outline-none w-full h-8 bg-transparent text-center text-black"
        value={passengers}
        onChange={(e) => onChange(parseInt(e.target.value) || 1)}
      />
    </div>
  );
}
