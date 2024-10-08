// File: /app/components/FlightFilters.tsx

'use client';

import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/solid'; // Import Heroicons

interface FlightFiltersProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  bestPrice: number;
  bestAvgDuration: string;
  cheapestPrice: number;
  cheapestAvgDuration: string;
  fastestPrice: number;
  fastestAvgDuration: string;
}

export default function FlightFilters({
  selectedFilter,
  onFilterChange,
  bestPrice,
  bestAvgDuration,
  cheapestPrice,
  cheapestAvgDuration,
  fastestPrice,
  fastestAvgDuration,
}: FlightFiltersProps) {
  return (
    <div className="flex w-full max-w-8xl m-4">
      {/* Best */}
      <div
        className={`flex-1 p-4 cursor-pointer ${
          selectedFilter === 'best'
            ? 'border-b-4 border-green-500'
            : 'border-b border-gray-300 dark:border-gray-600'
        }`}
        onClick={() => onFilterChange('best')}
      >
        <div className="flex items-center">
          <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Best
          </span>
          <div className="relative group">
            <InformationCircleIcon className="h-5 w-5 text-green-500 ml-1" />
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm p-2 rounded shadow-lg w-64">
              We think these flights offer the best combination of price and
              speed. We also consider factors like number of stops and amount of
              hassle. And if your preferences allow, we’ll personalize your
              search results.
            </div>
          </div>
        </div>
        <div className="text-green-500 text-xl font-bold">
          ${bestPrice.toFixed(2)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {bestAvgDuration} (average)
        </div>
      </div>

      {/* Cheapest */}
      <div
        className={`flex-1 p-4 cursor-pointer ${
          selectedFilter === 'cheapest'
            ? 'border-b-4 border-green-500'
            : 'border-b border-gray-300 dark:border-gray-600'
        }`}
        onClick={() => onFilterChange('cheapest')}
      >
        <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Cheapest
        </span>
        <div className="text-green-500 text-xl font-bold">
          ${cheapestPrice.toFixed(2)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {cheapestAvgDuration} (average)
        </div>
      </div>

      {/* Fastest */}
      <div
        className={`flex-1 p-4 cursor-pointer ${
          selectedFilter === 'fastest'
            ? 'border-b-4 border-green-500'
            : 'border-b border-gray-300 dark:border-gray-600'
        }`}
        onClick={() => onFilterChange('fastest')}
      >
        <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Fastest
        </span>
        <div className="text-green-500 text-xl font-bold">
          ${fastestPrice.toFixed(2)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {fastestAvgDuration} (average)
        </div>
      </div>
    </div>
  );
}
