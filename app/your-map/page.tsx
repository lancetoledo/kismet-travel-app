// File: /app/your-map/page.tsx

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMapGL, {
  Marker as MapboxMarker,
  Source,
  Layer,
  NavigationControl,
  Popup,
  MapRef,
  ViewState,
} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
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

// Import Header and PhotoUpload components
import Header from '../../components/Header';
import PhotoUpload from '../../components/PhotoUpload';

// Import Turf.js for bbox calculation
import bbox from '@turf/bbox';

// Define TypeScript interfaces
interface Photo {
  _id: string;
  userId: string;
  photoUrl: string;
  thumbnailUrl: string;
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  description: string;
  createdAt: string;
}

interface GeoFeatureProperties {
  STATEFP: string;
  GEOID?: string;
}

interface GeoFeature extends GeoJSON.Feature<GeoJSON.Geometry, GeoFeatureProperties> {}

// Define color constants
const VISITED_COLOR = '#2e7d32';
const UNVISITED_COLOR = '#a5d6a7';

// Define layer styles inline where needed

export default function YourMapPage() {
  // State variables with explicit types
  const [viewport, setViewport] = useState<ViewState>({
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
  const [usExplored, setUsExplored] = useState<number>(0); // U.S. Explored percentage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false); // Dark mode state
  const [userPhotos, setUserPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const { data: sessionData } = useSession();
  const mapRef = useRef<MapRef>(null);

  // Map state FIPS codes to state names using stateNames.json
  const stateFIPSToName: { [key: string]: string } = {};

  Object.entries(stateNames).forEach(([stateFIPS, stateName]) => {
    stateFIPSToName[stateFIPS] = stateName as string;
  });

  // Filter major cities to include only those with population > 100,000
  const majorCities = majorCitiesData.filter((city) => city.population > 100000);

  // Log imported data to ensure it's correctly loaded
  console.log('usStatesGeoJSON:', usStatesGeoJSON);
  console.log('usCountiesGeoJSON:', usCountiesGeoJSON);
  console.log('stateNames:', stateNames);
  console.log('countyNames:', countyNames);
  console.log('majorCitiesData:', majorCitiesData);

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
        console.log('Fetched User Photos:', response.data.photos);
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
          console.log('Updating visited locations:', {
            updatedStates,
            updatedCounties,
            calculatedUsExplored,
          });
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
          console.log('Update response:', response.data);
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

  // Fetch user photos when a new photo is uploaded
  const handlePhotoUploadSuccess = () => {
    const fetchUserPhotos = async () => {
      try {
        const response = await axios.get('/api/photos/user', {
          withCredentials: true,
        });
        console.log('Fetched User Photos after upload:', response.data.photos);
        setUserPhotos(response.data.photos);
      } catch (error) {
        console.error('Error fetching user photos:', error);
        toast.error('Failed to load your photos.');
      }
    };

    fetchUserPhotos();
  };

  // Handler for state click
  const handleStateClick = (stateId: string) => {
    console.log('handleStateClick called with stateId:', stateId);
    stateId = stateId.padStart(2, '0');
    console.log('Padded stateId:', stateId);
    setSelectedState(stateId);

    const stateFeature = usStatesGeoJSON.features.find(
      (feature: GeoFeature) => feature.properties.STATEFP === stateId
    );

    console.log('stateFeature:', stateFeature);

    if (stateFeature) {
      const boundingBox = bbox(stateFeature);
      console.log('State bounding box:', boundingBox);
      if (mapRef.current) {
        mapRef.current.fitBounds(
          [
            [boundingBox[0], boundingBox[1]],
            [boundingBox[2], boundingBox[3]],
          ],
          {
            padding: 20,
          }
        );
      } else {
        console.error('mapRef.current is null in handleStateClick');
      }
    } else {
      console.warn('No state feature found for stateId:', stateId);
    }
  };

  // Handler to toggle visited state
  const toggleVisitedState = (stateId: string) => {
    console.log('toggleVisitedState called with stateId:', stateId);
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
        .filter((county: GeoFeature) => county.properties.STATEFP === stateId)
        .map((county: GeoFeature) => county.properties.GEOID);

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
    console.log('handleCountyClick called with countyId:', countyId, 'stateId:', stateId);
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
      (county: GeoFeature) => county.properties.STATEFP === stateId
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
    console.log('Resetting zoom to default');
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
  const handleMapClick = (event: any) => {
    console.log('Map clicked:', event);
    if (!mapRef.current) {
      console.error('mapRef.current is undefined');
      return;
    }
    if (!event.point) {
      console.error('event.point is undefined');
      return;
    }
    const features = mapRef.current.queryRenderedFeatures(event.point, {
      layers: ['states-layer', 'counties-layer'],
    });
    console.log('Features at click point:', features);

    if (!features || features.length === 0) return;

    const feature = features[0];
    console.log('Clicked feature:', feature);

    if (feature.layer.id === 'states-layer') {
      const stateId = feature.properties?.STATEFP;
      console.log('State ID from feature:', stateId);
      if (stateId) {
        handleStateClick(stateId);
      } else {
        console.warn('STATEFP property is missing in clicked state feature');
      }
    } else if (feature.layer.id === 'counties-layer') {
      const countyId = feature.properties?.GEOID;
      const stateId = countyId?.slice(0, 2);
      console.log('County ID from feature:', countyId, 'State ID:', stateId);
      if (countyId && stateId) {
        handleCountyClick(countyId, stateId);
      } else {
        console.warn('GEOID property is missing in clicked county feature');
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

          {/* Photo Upload Component */}
          <PhotoUpload onUploadSuccess={handlePhotoUploadSuccess} />

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
                  mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
                  onMove={(evt) => {
                    console.log('Viewport changed:', evt.viewState);
                    setViewport(evt.viewState);
                  }}
                  onClick={handleMapClick}
                  interactiveLayerIds={['states-layer', 'counties-layer']}
                >
                  {/* Navigation Control */}
                  <NavigationControl style={{ right: 10, top: 10 }} showCompass={false} />

                  {/* States Layer */}
                  {usStatesGeoJSON && (
                    <Source id="states" type="geojson" data={usStatesGeoJSON}>
                      <Layer
                        id="states-layer"
                        type="fill"
                        paint={{
                          'fill-color': [
                            'case',
                            ['in', ['get', 'STATEFP'], ['literal', visitedStates]],
                            VISITED_COLOR, // Visited state color
                            UNVISITED_COLOR, // Unvisited state color
                          ],
                          'fill-outline-color': '#FFFFFF',
                          'fill-opacity': 0.6,
                        }}
                      />
                    </Source>
                  )}

                  {/* Counties Layer (when a state is selected) */}
                  {selectedState && usCountiesGeoJSON && (
                    <Source
                      id="counties"
                      type="geojson"
                      data={{
                        type: 'FeatureCollection',
                        features: usCountiesGeoJSON.features.filter((feature: GeoFeature) => {
                          const match = feature.properties.STATEFP === selectedState;
                          return match;
                        }),
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
                            VISITED_COLOR, // Visited county color
                            UNVISITED_COLOR, // Unvisited county color
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
                    .map((city) => (
                      <MapboxMarker
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
                      </MapboxMarker>
                    ))}

                  {/* User Photos Markers */}
                  {userPhotos.map((photo) => (
                    <MapboxMarker
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
                    </MapboxMarker>
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
