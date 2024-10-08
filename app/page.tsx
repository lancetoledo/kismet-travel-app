// File: /app/page.tsx

'use client';

import Header from '../components/Header';
import Banner from '../components/Banner';
import FlightCard from '../components/FlightCard';
import { useState, useEffect } from 'react'; // Added useEffect
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

export default function Home() {
  const [flights, setFlights] = useState<Flight[]>([]);

  // Check for cached flights on component mount
  useEffect(() => {
    const cachedFlights = localStorage.getItem('cachedFlights');
    if (cachedFlights) {
      setFlights(JSON.parse(cachedFlights));
    }
  }, []);

  const handleSearch = (searchedFlights: Flight[]) => {
    setFlights(searchedFlights);

    // Cache flights in localStorage
    localStorage.setItem('cachedFlights', JSON.stringify(searchedFlights));
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-500">
      <div className="container mx-auto px-8 w-full flex flex-col items-center">
        <Header />
        <Banner onSearch={handleSearch} />
        <div className="w-full flex flex-wrap justify-center">
          {flights.length > 0 ? (
            flights.map((flight) => <FlightCard key={flight.id} flight={flight} />)
          ) : (
            <p className="mt-8 text-gray-700 dark:text-gray-300">
              Search for flights to see available options.
            </p>
          )}
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </main>
  );
}
