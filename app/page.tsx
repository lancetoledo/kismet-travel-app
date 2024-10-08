// File: /app/page.tsx

'use client';

import Header from '../components/Header';
import Banner from '../components/Banner';
import FlightCard from '../components/FlightCard';
import FlightFilters from '../components/FlightFilters'; // Import the new component
import { useState, useEffect } from 'react';
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
  logoUrl: string;
}

export default function Home() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('best');

  // State for filter data
  const [bestPrice, setBestPrice] = useState(0);
  const [bestAvgDuration, setBestAvgDuration] = useState('');
  const [cheapestPrice, setCheapestPrice] = useState(0);
  const [cheapestAvgDuration, setCheapestAvgDuration] = useState('');
  const [fastestPrice, setFastestPrice] = useState(0);
  const [fastestAvgDuration, setFastestAvgDuration] = useState('');

  // Check for cached flights on component mount
  useEffect(() => {
    const cachedFlights = localStorage.getItem('cachedFlights');
    if (cachedFlights) {
      const parsedFlights = JSON.parse(cachedFlights);
      setFlights(parsedFlights);
      computeFilterData(parsedFlights);
    }
  }, []);

  const handleSearch = (searchedFlights: Flight[]) => {
    setFlights(searchedFlights);
    computeFilterData(searchedFlights);
    // Cache flights in localStorage
    localStorage.setItem('cachedFlights', JSON.stringify(searchedFlights));
  };

  // Compute filter data whenever flights change
  useEffect(() => {
    filterFlights();
  }, [flights, selectedFilter]);

  const computeFilterData = (flightsData: Flight[]) => {
    if (flightsData.length === 0) return;

    // Cheapest flight
    const cheapestFlight = [...flightsData].sort((a, b) => a.price - b.price)[0];
    setCheapestPrice(cheapestFlight.price);
    setCheapestAvgDuration(calculateAverageDuration([cheapestFlight]));

    // Fastest flight
    const fastestFlight = [...flightsData].sort(
      (a, b) => getTotalDuration(a) - getTotalDuration(b)
    )[0];
    setFastestPrice(fastestFlight.price);
    setFastestAvgDuration(calculateAverageDuration([fastestFlight]));

    // Best flight (cheapest direct flight)
    const directFlights = flightsData.filter(isDirectFlight);
    const bestFlight = directFlights.length
      ? directFlights.sort((a, b) => a.price - b.price)[0]
      : cheapestFlight;
    setBestPrice(bestFlight.price);
    setBestAvgDuration(calculateAverageDuration([bestFlight]));
  };

  const filterFlights = () => {
    let filtered = [...flights];
    if (selectedFilter === 'cheapest') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (selectedFilter === 'fastest') {
      filtered.sort((a, b) => getTotalDuration(a) - getTotalDuration(b));
    } else if (selectedFilter === 'best') {
      const directFlights = filtered.filter(isDirectFlight);
      if (directFlights.length) {
        filtered = directFlights.sort((a, b) => a.price - b.price);
      } else {
        filtered.sort((a, b) => a.price - b.price);
      }
    }
    setFilteredFlights(filtered);
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
  };

  const getTotalDuration = (flight: Flight) => {
    let totalMinutes = 0;
    flight.itineraries.forEach((itinerary) => {
      const duration = parseDuration(itinerary.duration);
      totalMinutes += duration.hours * 60 + duration.minutes;
    });
    return totalMinutes;
  };

  const parseDuration = (durationStr: string) => {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?/;
    const matches = durationStr.match(regex);
    const hours = matches && matches[1] ? parseInt(matches[1]) : 0;
    const minutes = matches && matches[2] ? parseInt(matches[2]) : 0;
    return { hours, minutes };
  };

  const calculateAverageDuration = (flightsData: Flight[]) => {
    if (flightsData.length === 0) return 'N/A';
    const totalMinutes = flightsData.reduce((acc, flight) => acc + getTotalDuration(flight), 0);
    const avgMinutes = totalMinutes / flightsData.length;
    const hours = Math.floor(avgMinutes / 60);
    const minutes = Math.round(avgMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  const isDirectFlight = (flight: Flight) => {
    return flight.itineraries.every((itinerary) => itinerary.segments.length === 1);
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-500">
      <div className="container mx-auto px-8 w-full flex flex-col items-center">
        <Header />
        <Banner onSearch={handleSearch} />
        {flights.length > 0 && (
          <FlightFilters
            selectedFilter={selectedFilter}
            onFilterChange={handleFilterChange}
            bestPrice={bestPrice}
            bestAvgDuration={bestAvgDuration}
            cheapestPrice={cheapestPrice}
            cheapestAvgDuration={cheapestAvgDuration}
            fastestPrice={fastestPrice}
            fastestAvgDuration={fastestAvgDuration}
          />
        )}
        <div className="w-full flex flex-wrap justify-center">
          {filteredFlights.length > 0 ? (
            filteredFlights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))
          ) : flights.length > 0 ? (
            <p className="mt-8 text-gray-700 dark:text-gray-300">
              No flights found for the selected filter.
            </p>
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
