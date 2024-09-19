// File: /app/your-map/page.tsx

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMapGL, {
  Marker,
  Source,
  Layer,
  NavigationControl,
  Popup,
  MapRef,
  MapLayerMouseEvent,
} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import debounce from 'lodash.debounce';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import data files
import countyNames from '../../data/countyNames.json';
import stateNames from '../../data/stateNames.json';
import majorCitiesData from '../../data/majorCities.json';

// Import GeoJSON data
import usStatesGeoJSON from '../../data/usStatesGeo.json';
import usCountiesGeoJSON from '../../data/usCountiesGeo.json';

// Import Header component
import Header from '../../components/Header';

// Import Tooltip (optional)
// You can use libraries like react-tooltip or implement custom tooltips
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

// Import Turf.js for bbox calculation
import bbox from '@turf/bbox';
import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

// Define TypeScript interfaces
interface City {
  geonameid: number;
  name: string;
  latitude: number;
  longitude: number;
  population: number;
  stateId: string;
}

interface Photo {
  _id: string;
  userId: string;
  photoUrl: string;
  thumbnailUrl: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  description: string;
  createdAt: string;
}

// Define color scale for visited and unvisited areas
const visitedColor = '#2e7d32';
const unvisitedColor = '#a5d6a7';
const hoverColor = '#66bb6a';
const pressedColor = '#388e3c';

// Define layer styles
const stateLayerStyle: mapboxgl.AnyLayer = {
  id: 'states-layer',
  type: 'fill',
  paint: {
    'fill-color': ['case', ['in', ['get', 'STATEFP'], ['literal', []]], visitedColor, unvisitedColor],
    'fill-outline-color': '#FFFFFF',
    'fill-opacity': 0.6,
  },
};

const countyLayerStyle: mapboxgl.AnyLayer = {
  id: 'counties-layer',
  type: 'fill',
  paint: {
    'fill-color': ['case', ['in', ['get', 'GEOID'], ['literal', []]], visitedColor, unvisitedColor],
    'fill-outline-color': '#FFFFFF',
    'fill-opacity': 0.6,
  },
};

export default function YourMapPage() {
  // State variables
  const [viewport, setViewport] = useState({
    latitude: 38,
    longitude: -97,
    zoom: 3,
    bearing: 0,
    pitch: 0,
  });

  const [visitedStates, setVisitedStates] = useState<string[]>([]);
  const [visitedCounties, setVisitedCounties] = useState<{ [stateId: string]: string[] }>({});
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [usExplored, setUsExplored] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [userPhotos, setUserPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const { data: sessionData } = useSession();
  const mapRef = useRef<MapRef>(null);

  // Fetch visited locations on mount
  useEffect(() => {
    if (!sessionData) {
      setIsLoading(false);
      return;
    }

    const fetchVisitedLocations = async () => {
      try {
        const response = await axios.get('/api/user/visited-locations', {
          withCredentials: true,
        });
        console.log('Fetched Visited Locations:', response.data);
        const { visitedStates, visitedCounties, usExplored } = response.data;
        setVisitedStates(visitedStates);
        setVisitedCounties(visitedCounties);
        setUsExplored(usExplored);
      } catch (error) {
        console.error('Error fetching visited locations:', error);
        setError('Failed to load visited locations.');
        toast.error('Failed to load your visited locations.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVisitedLocations();
  }, [sessionData]);

  // Fetch user photos on mount
  useEffect(() => {
    const fetchUserPhotos = async () => {
      try {
        const response = await axios.get('/api/photos/user', {
          withCredentials: true,
        });
        setUserPhotos(response.data.photos);
      } catch (error) {
        console.error('Error fetching user photos:', error);
        toast.error('Failed to load your photos.');
      }
    };

    if (sessionData) {
      fetchUserPhotos();
    }
  }, [sessionData]);

  // Debounced function to update visited locations
  const updateVisitedLocations = useCallback(
    debounce(
      async (
        updatedStates: string[],
        updatedCounties: { [key: string]: string[] },
        calculatedUsExplored: number
      ) => {
        try {
          const response = await axios.post(
            '/api/user/visited-locations',
            {
              visitedStates: updatedStates,
              visitedCounties: updatedCounties,
            },
            {
              withCredentials: true,
            }
          );
          setUsExplored(response.data.usExplored);
          toast.success('Visited locations updated successfully!');
        } catch (error) {
          console.error('Error updating visited locations:', error);
          toast.error('Failed to update visited locations.');
        }
      },
      500
    ),
    []
  );

  // Handler for state click
  const handleStateClick = (stateId: string) => {
    stateId = stateId.padStart(2, '0');
    setSelectedState(stateId);

    const stateFeature = usStatesGeoJSON.features.find(
      (feature) => feature.properties.STATEFP === stateId
    );

    if (stateFeature) {
      const boundingBox = bbox(stateFeature);
      mapRef.current?.fitBounds(
        [
          [boundingBox[0], boundingBox[1]],
          [boundingBox[2], boundingBox[3]],
        ],
        {
          padding: 20,
        }
      );
    }
  };

  // Handler to toggle visited state
  const toggleVisitedState = (stateId: string) => {
    stateId = stateId.padStart(2, '0');
    let updatedStates: string[];
    let updatedCounties: { [key: string]: string[] } = { ...visitedCounties };

    if (visitedStates.includes(stateId)) {
      // Remove state from visitedStates
      updatedStates = visitedStates.filter((id) => id !== stateId);
      toast.info(`State ${stateFIPSToName[stateId]} marked as not visited.`);

      // Remove all counties under this state
      delete updatedCounties[stateId];
    } else {
      // Add state to visitedStates
      updatedStates = [...visitedStates, stateId];
      toast.success(`State ${stateFIPSToName[stateId]} marked as visited.`);

      // Mark all counties in the state as visited
      const stateCounties = usCountiesGeoJSON.features
        .filter((county) => county.properties.STATEFP === stateId)
        .map((county) => county.properties.GEOID);

      updatedCounties[stateId] = stateCounties;
    }

    setVisitedStates(updatedStates);
    setVisitedCounties(updatedCounties);

    // Calculate the new U.S. Explored percentage
    const newUsExplored = parseFloat(((updatedStates.length / 50) * 100).toFixed(2)); // Assuming 50 states

    updateVisitedLocations(updatedStates, updatedCounties, newUsExplored);
  };

  // Handler to toggle visited county
  const handleCountyClick = (countyId: string, stateId: string) => {
    stateId = stateId.padStart(2, '0');
    const stateCounties = visitedCounties[stateId] || [];
    let updatedCounties: string[];
    let updatedStates: string[] = [...visitedStates];

    if (stateCounties.includes(countyId)) {
      // Remove county from visitedCounties
      updatedCounties = stateCounties.filter((id) => id !== countyId);
      toast.info(`County ${countyNames[countyId] || countyId} marked as not visited.`);

      // If no counties remain visited in the state, remove the state from visitedStates
      if (updatedCounties.length === 0) {
        updatedStates = visitedStates.filter((id) => id !== stateId);
        delete visitedCounties[stateId];
      }

      const updatedVisitedCounties: { [key: string]: string[] } = {
        ...visitedCounties,
        [stateId]: updatedCounties,
      };
      if (updatedCounties.length === 0) {
        delete updatedVisitedCounties[stateId];
      }

      setVisitedCounties(updatedVisitedCounties);
      setVisitedStates(updatedStates);

      const newUsExplored = parseFloat(((updatedStates.length / 50) * 100).toFixed(2));

      updateVisitedLocations(updatedStates, updatedVisitedCounties, newUsExplored);
    } else {
      // Add county to visitedCounties
      updatedCounties = [...stateCounties, countyId];
      toast.success(`County ${countyNames[countyId] || countyId} marked as visited.`);

      // Ensure the state is in visitedStates
      if (!visitedStates.includes(stateId)) {
        updatedStates = [...visitedStates, stateId];
      }

      const updatedVisitedCounties: { [key: string]: string[] } = {
        ...visitedCounties,
        [stateId]: updatedCounties,
      };

      setVisitedCounties(updatedVisitedCounties);
      setVisitedStates(updatedStates);

      const newUsExplored = parseFloat(((updatedStates.length / 50) * 100).toFixed(2));

      updateVisitedLocations(updatedStates, updatedVisitedCounties, newUsExplored);
    }
  };

  // Calculate the percentage of explored counties in a state
  const calculateStateExploredPercentage = (stateId: string): string => {
    stateId = stateId.padStart(2, '0');
    const stateCounties = usCountiesGeoJSON.features.filter(
      (county) => county.properties.STATEFP === stateId
    );
    const totalCounties = stateCounties.length;
    const visitedCountyIds = visitedCounties[stateId] || [];
    const visitedCountiesCount = visitedCountyIds.length;

    if (totalCounties === 0) {
      return '0.00';
    }
    const percentage = ((visitedCountiesCount / totalCounties) * 100).toFixed(2);
    return percentage;
  };

  // Reset zoom to default position
  const resetZoom = () => {
    setViewport({
      latitude: 38,
      longitude: -97,
      zoom: 3,
      bearing: 0,
      pitch: 0,
    });
    setSelectedState(null);
  };

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Handle Map Clicks for Layers
  const handleMapClick = (event: mapboxgl.MapLayerMouseEvent) => {
    const features = mapRef.current?.queryRenderedFeatures(event.point, {
      layers: ['states-layer', 'counties-layer'],
    });

    if (!features || features.length === 0) return;

    const feature = features[0];

    if (feature.layer.id === 'states-layer') {
      const stateId = feature.properties?.STATEFP;
      if (stateId) {
        handleStateClick(stateId);
      }
    } else if (feature.layer.id === 'counties-layer') {
      const countyId = feature.properties?.GEOID;
      const stateId = countyId?.slice(0, 2);
      if (countyId && stateId) {
        handleCountyClick(countyId, stateId);
      }
    }
  };

  // Loading and error states
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen dark:bg-gray-900">
        <p className="text-gray-800 dark:text-gray-200">Loading your map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen dark:bg-gray-900">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex justify-center items-center h-screen dark:bg-gray-900">
        <p className="text-gray-800 dark:text-gray-200">
          Please log in to view your travel map.
        </p>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gradient-to-b from-white to-green-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500">
        {/* Header Component */}
        <Header />

        {/* Toast Container */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={isDarkMode ? 'dark' : 'light'}
        />

        {/* Dark Mode Toggle */}
        <div className="flex justify-end p-4">
          <button
            onClick={toggleDarkMode}
            className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 transition-colors duration-200 dark:bg-green-600 dark:hover:bg-green-500"
          >
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-extrabold text-green-700 mb-8 text-center dark:text-green-300">
            Your Travel Map
          </h1>

          <div className="bg-white shadow rounded-lg p-6 mb-8 dark:bg-gray-800">
            <div className="flex justify-center">
              <div className="w-full h-[600px]">
                <ReactMapGL
                  {...viewport}
                  ref={mapRef}
                  mapStyle={
                    isDarkMode
                      ? 'mapbox://styles/mapbox/dark-v10'
                      : 'mapbox://styles/mapbox/light-v10'
                  }
                  onMove={(evt) => setViewport(evt.viewState)}
                  mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
                  onClick={handleMapClick}
                  interactiveLayerIds={['states-layer', 'counties-layer']}
                >
                  {/* Navigation Control */}
                  <NavigationControl style={{ right: 10, top: 10 }} showCompass={false} />

                  {/* States Layer */}
                  <Source id="states" type="geojson" data={usStatesGeoJSON}>
                    <Layer
                      id="states-layer"
                      type="fill"
                      paint={{
                        'fill-color': [
                          'case',
                          ['in', ['get', 'STATEFP'], ['literal', visitedStates]],
                          visitedColor,
                          unvisitedColor,
                        ],
                        'fill-outline-color': '#FFFFFF',
                        'fill-opacity': 0.6,
                      }}
                    />
                  </Source>

                  {/* Counties Layer (when a state is selected) */}
                  {selectedState && (
                    <Source
                      id="counties"
                      type="geojson"
                      data={{
                        type: 'FeatureCollection',
                        features: usCountiesGeoJSON.features.filter(
                          (feature) => feature.properties.STATEFP === selectedState
                        ),
                      }}
                    >
                      <Layer
                        id="counties-layer"
                        type="fill"
                        paint={{
                          'fill-color': [
                            'case',
                            [
                              'in',
                              ['get', 'GEOID'],
                              ['literal', visitedCounties[selectedState] || []],
                            ],
                            visitedColor,
                            unvisitedColor,
                          ],
                          'fill-outline-color': '#FFFFFF',
                          'fill-opacity': 0.6,
                        }}
                      />
                    </Source>
                  )}

                  {/* Major Cities Markers */}
                  {majorCities
                    .filter((city) => !selectedState || city.stateId === selectedState)
                    .map((city: City) => (
                      <Marker
                        key={city.geonameid}
                        latitude={city.latitude}
                        longitude={city.longitude}
                      >
                        <div
                          title={`${city.name}, ${stateFIPSToName[city.stateId]}`}
                          style={{ cursor: 'pointer' }}
                        >
                          <svg
                            height="10"
                            viewBox="0 0 24 24"
                            style={{ fill: '#FF5722', stroke: 'none' }}
                          >
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        </div>
                      </Marker>
                    ))}

                  {/* User Photos Markers */}
                  {userPhotos.map((photo: Photo) => (
                    <Marker
                      key={photo._id}
                      latitude={photo.location.coordinates[1]}
                      longitude={photo.location.coordinates[0]}
                    >
                      <div
                        onClick={() => setSelectedPhoto(photo)}
                        style={{ cursor: 'pointer' }}
                      >
                        <img
                          src={photo.thumbnailUrl}
                          alt="User Photo"
                          className="rounded-full w-8 h-8 border-2 border-white"
                        />
                      </div>
                    </Marker>
                  ))}

                  {/* Photo Popup */}
                  {selectedPhoto && (
                    <Popup
                      latitude={selectedPhoto.location.coordinates[1]}
                      longitude={selectedPhoto.location.coordinates[0]}
                      onClose={() => setSelectedPhoto(null)}
                      closeOnClick={false}
                      offsetTop={-10}
                    >
                      <div className="text-center">
                        <img
                          src={selectedPhoto.photoUrl}
                          alt="Selected Photo"
                          className="w-64 h-64 object-cover rounded"
                        />
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                          {selectedPhoto.description}
                        </p>
                      </div>
                    </Popup>
                  )}
                </ReactMapGL>
              </div>
            </div>

            {/* Controls */}
            {selectedState && (
              <div className="flex justify-center mb-8">
                <button
                  onClick={resetZoom}
                  className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 transition-colors duration-200 dark:bg-green-600 dark:hover:bg-green-500"
                >
                  Back to U.S. Map
                </button>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white shadow rounded-lg p-6 dark:bg-gray-800">
              <h2 className="text-2xl font-semibold text-green-700 mb-4 text-center dark:text-green-300">
                {selectedState
                  ? `${stateFIPSToName[selectedState]} Travel Stats`
                  : sessionData?.user?.name
                  ? `${sessionData.user.name}'s Travel Stats`
                  : 'Your Travel Stats'}
              </h2>
              {selectedState === null ? (
                <div className="flex justify-around">
                  <p className="text-lg text-gray-700 dark:text-gray-200">
                    States Visited:{' '}
                    <span className="font-bold text-green-700 dark:text-green-300">
                      {visitedStates.length}
                    </span>
                  </p>
                  <p className="text-lg text-gray-700 dark:text-gray-200">
                    U.S. Explored:{' '}
                    <span className="font-bold text-green-700 dark:text-green-300">
                      {usExplored}%
                    </span>
                  </p>
                </div>
              ) : (
                <div className="flex justify-around">
                  <p className="text-lg text-gray-700 dark:text-gray-200">
                    Counties Visited in {stateFIPSToName[selectedState]}:{' '}
                    <span className="font-bold text-green-700 dark:text-green-300">
                      {(visitedCounties[selectedState] || []).length}
                    </span>
                  </p>
                  <p className="text-lg text-gray-700 dark:text-gray-200">
                    {stateFIPSToName[selectedState]} Explored:{' '}
                    <span className="font-bold text-green-700 dark:text-green-300">
                      {calculateStateExploredPercentage(selectedState)}%
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
