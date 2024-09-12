// app/your-map/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { useSession } from 'next-auth/react';
import { feature } from 'topojson-client';
import usData from 'us-atlas/states-10m.json';
import { FeatureCollection } from 'geojson';

// Import the Header component
import Header from '../../components/Header';

const geoData = feature(usData, usData.objects.states) as FeatureCollection;

const colorScale = scaleLinear<string>()
  .domain([0, 1])
  .range(['#e0f2f1', '#00796b']); // Adjusted colors to fit the green theme

export default function YourMapPage() {
  const [visitedStates, setVisitedStates] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const storedStates = localStorage.getItem('visitedStates');
      return storedStates ? JSON.parse(storedStates) : [];
    }
    return [];
  });
  const { data: sessionData } = useSession();

  const handleStateClick = (stateId: string) => {
    let updatedStates: string[];
    if (visitedStates.includes(stateId)) {
      updatedStates = visitedStates.filter((id) => id !== stateId);
    } else {
      updatedStates = [...visitedStates, stateId];
    }
    setVisitedStates(updatedStates);

    if (typeof window !== 'undefined') {
      localStorage.setItem('visitedStates', JSON.stringify(updatedStates));
    }
  };

  const calculateExploredPercentage = () => {
    const totalStates = geoData.features.length;
    if (totalStates === 0) {
      return '0.00';
    }
    const percentage = (
      (visitedStates.length / totalStates) *
      100
    ).toFixed(2);
    return percentage;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-green-50">
      {/* Header Component */}
      <Header />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-extrabold text-green-700 mb-8 text-center">
          Your Travel Map
        </h1>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex justify-center">
            <ComposableMap
              projection="geoAlbersUsa"
              width={800}
              height={500}
            >
              <Geographies geography={geoData}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const stateId = geo.id.toString();
                    const isVisited = visitedStates.includes(stateId);
                    return (
                      <Geography
                        key={stateId}
                        geography={geo}
                        fill={isVisited ? colorScale(1) : colorScale(0)}
                        stroke="#FFFFFF"
                        strokeWidth={0.5}
                        onClick={() => handleStateClick(stateId)}
                        style={{
                          default: {
                            outline: 'none',
                          },
                          hover: {
                            fill: '#80cbc4',
                            outline: 'none',
                            cursor: 'pointer',
                          },
                          pressed: {
                            fill: '#4db6ac',
                            outline: 'none',
                          },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-green-700 mb-4 text-center">
            {sessionData?.user?.name
              ? `${sessionData.user.name}'s Travel Stats`
              : 'Your Travel Stats'}
          </h2>
          <div className="flex justify-around">
            <p className="text-lg text-gray-700">
              States Visited:{' '}
              <span className="font-bold text-green-700">
                {visitedStates.length}
              </span>
            </p>
            <p className="text-lg text-gray-700">
              U.S. Explored:{' '}
              <span className="font-bold text-green-700">
                {calculateExploredPercentage()}%
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
