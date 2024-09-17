// app/your-map/page.tsx
'use client';

import React, { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { useSession } from 'next-auth/react';
import { feature } from 'topojson-client';
import { geoCentroid } from 'd3-geo';
import usData from 'us-atlas/states-10m.json';
import countiesData from 'us-atlas/counties-10m.json';
import { FeatureCollection, Geometry } from 'geojson';

// Import the Header component
import Header from '../../components/Header';

// Import the majorCities and countyNames data
import countyNames from '../../data/countyNames.json';
import majorCities from '../../data/majorCities.json';

// Process the U.S. states map data
const usGeoData = feature(usData, usData.objects.states) as FeatureCollection;

// Process the U.S. counties map data
const countiesGeoData = feature(
  countiesData,
  countiesData.objects.counties
) as FeatureCollection<Geometry, { STATE: string; COUNTY: string }>;

// Map state FIPS codes to state names
const stateFIPSToName: { [key: string]: string } = {};

Object.entries(countyNames).forEach(([stateFIPS, stateName]) => {
  stateFIPSToName[stateFIPS] = stateName;
});

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

  const [visitedCounties, setVisitedCounties] = useState<{
    [stateId: string]: string[];
  }>(() => {
    if (typeof window !== 'undefined') {
      const storedCounties = localStorage.getItem('visitedCounties');
      return storedCounties ? JSON.parse(storedCounties) : {};
    }
    return {};
  });

  const { data: sessionData } = useSession();

  const [position, setPosition] = useState<{
    coordinates: [number, number];
    zoom: number;
  }>({
    coordinates: [-97, 38], // Center of the U.S.
    zoom: 1,
  });

  const [selectedState, setSelectedState] = useState<string | null>(null);

  const handleStateClick = (geo: any) => {
    const centroid = geoCentroid(geo);
    const stateId = geo.id.toString().padStart(2, '0');
    setPosition({ coordinates: centroid as [number, number], zoom: 4 });
    setSelectedState(stateId);
  };

  const toggleVisitedState = (stateId: string) => {
    stateId = stateId.padStart(2, '0');
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

  const handleCountyClick = (countyId: string, stateId: string) => {
    stateId = stateId.padStart(2, '0');
    const stateCounties = visitedCounties[stateId] || [];
    let updatedCounties: string[];
    if (stateCounties.includes(countyId)) {
      updatedCounties = stateCounties.filter((id) => id !== countyId);
    } else {
      updatedCounties = [...stateCounties, countyId];
    }
    const updatedVisitedCounties = {
      ...visitedCounties,
      [stateId]: updatedCounties,
    };
    setVisitedCounties(updatedVisitedCounties);

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'visitedCounties',
        JSON.stringify(updatedVisitedCounties)
      );
    }
  };

  const calculateExploredPercentage = () => {
    const totalStates = usGeoData.features.length;
    if (totalStates === 0) {
      return '0.00';
    }
    const percentage = ((visitedStates.length / totalStates) * 100).toFixed(2);
    return percentage;
  };

  const calculateStateExploredPercentage = (stateId: string) => {
    stateId = stateId.padStart(2, '0');
    const stateCounties = countiesGeoData.features.filter(
      (county) => county.id.toString().slice(0, 2) === stateId
    );
    const totalCounties = stateCounties.length;
    const visitedCountyIds = visitedCounties[stateId] || [];
    const visitedCountiesCount = visitedCountyIds.length;

    if (totalCounties === 0) {
      return '0.00';
    }
    const percentage = (
      (visitedCountiesCount / totalCounties) *
      100
    ).toFixed(2);
    return percentage;
  };

  const resetZoom = () => {
    setPosition({ coordinates: [-97, 38], zoom: 1 });
    setSelectedState(null);
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
              projectionConfig={{ scale: 1000 }}
              width={800}
              height={500}
            >
              <ZoomableGroup
                center={position.coordinates}
                zoom={position.zoom}
                onMoveEnd={setPosition}
              >
                {selectedState === null ? (
                  <>
                    {/* U.S. States Map */}
                    <Geographies geography={usGeoData}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const stateId = geo.id.toString().padStart(2, '0');
                          const isVisited = visitedStates.includes(stateId);
                          return (
                            <Geography
                              key={stateId}
                              geography={geo}
                              fill={isVisited ? colorScale(1) : colorScale(0)}
                              stroke="#FFFFFF"
                              strokeWidth={0.5}
                              onClick={() => handleStateClick(geo)}
                              onDoubleClick={() => toggleVisitedState(stateId)}
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

                    {/* City Markers */}
                    {majorCities.map((city) => (
                      <Marker
                        key={city.geonameid}
                        coordinates={[city.longitude, city.latitude]}
                      >
                        <circle r={2} fill="#FF5722" />
                        <title>{`${city.name}, ${stateFIPSToName[city.stateId]}`}</title>
                      </Marker>
                    ))}
                  </>
                ) : (
                  <>
                    {/* State Counties Map */}
                    <Geographies geography={countiesGeoData}>
                      {({ geographies }) =>
                        geographies
                          .filter(
                            (geo) =>
                              geo.id.toString().slice(0, 2) === selectedState
                          )
                          .map((geo) => {
                            const countyId = geo.id.toString();
                            const stateId = selectedState;
                            const isVisited = (
                              visitedCounties[stateId] || []
                            ).includes(countyId);
                            return (
                              <Geography
                                key={countyId}
                                geography={geo}
                                fill={isVisited ? colorScale(1) : colorScale(0)}
                                stroke="#FFFFFF"
                                strokeWidth={0.5}
                                onClick={() => handleCountyClick(countyId, stateId)}
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

                    {/* City Markers for the Selected State */}
                    {majorCities
                      .filter((city) => city.stateId === selectedState)
                      .map((city) => (
                        <Marker
                          key={city.geonameid}
                          coordinates={[city.longitude, city.latitude]}
                        >
                          <circle r={2} fill="#FF5722" />
                          <title>{city.name}</title>
                        </Marker>
                      ))}
                  </>
                )}
              </ZoomableGroup>
            </ComposableMap>
          </div>
        </div>

        {/* Controls */}
        {selectedState && (
          <div className="flex justify-center mb-8">
            <button
              onClick={resetZoom}
              className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 transition-colors duration-200"
            >
              Back to U.S. Map
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-green-700 mb-4 text-center">
            {selectedState
              ? `${stateFIPSToName[selectedState]} Travel Stats`
              : sessionData?.user?.name
              ? `${sessionData.user.name}'s Travel Stats`
              : 'Your Travel Stats'}
          </h2>
          {selectedState === null ? (
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
          ) : (
            <div className="flex justify-around">
              <p className="text-lg text-gray-700">
                Counties Visited in {stateFIPSToName[selectedState]}:{' '}
                <span className="font-bold text-green-700">
                  {(visitedCounties[selectedState] || []).length}
                </span>
              </p>
              <p className="text-lg text-gray-700">
                {stateFIPSToName[selectedState]} Explored:{' '}
                <span className="font-bold text-green-700">
                  {calculateStateExploredPercentage(selectedState)}%
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
