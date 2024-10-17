// File: /app/your-map/page.tsx

'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Fragment,
} from 'react';
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
import majorCitiesData from '../../data/majorCities.json';

// Import GeoJSON data
import usStatesGeoJSON from '../../data/usStatesFeatureCollection.json';
import usCountiesGeoJSON from '../../data/usCountiesFeatureCollection.json';

// Import components
import Header from '../../components/Header';
import PhotoUpload from '../../components/PhotoUpload';

// Import icons
import { FiMoon, FiSun, FiUpload } from 'react-icons/fi';
import { Dialog, Transition } from '@headlessui/react';

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
  STATEFP?: string;
  GEOID?: string;
  NAME?: string;
  explorationPercentage?: number;
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
  const [visitedCounties, setVisitedCounties] = useState<{
    [stateId: string]: string[];
  }>({});
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [usExplored, setUsExplored] = useState<number>(0); // U.S. Explored percentage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // Default to dark mode
  const [userPhotos, setUserPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false); // For upload modal

  const [statesGeoJSONWithPercentages, setStatesGeoJSONWithPercentages] =
    useState<any>(null);

  // State variables for tracking mouse events
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const { data: sessionData } = useSession();
  const mapRef = useRef<MapRef>(null);

  // Map state FIPS codes to state names using properties from usStatesGeoJSON
  const stateFIPSToName: { [key: string]: string } = {};
  usStatesGeoJSON.features.forEach((feature: GeoFeature) => {
    const stateId = feature.properties?.STATEFP;
    const stateName = feature.properties?.NAME;
    if (stateId && stateName) {
      stateFIPSToName[stateId] = stateName;
    }
  });

  // Map county GEOIDs to names using properties from usCountiesGeoJSON
  const countyGEOIDToName: { [key: string]: string } = {};
  usCountiesGeoJSON.features.forEach((feature: GeoFeature) => {
    const countyId = feature.properties?.GEOID;
    const countyName = feature.properties?.NAME;
    if (countyId && countyName) {
      countyGEOIDToName[countyId] = countyName;
    }
  });

  // Hover state variables
  const [hoveredStateId, setHoveredStateId] = useState<string | null>(null);
  const [hoveredCountyId, setHoveredCountyId] = useState<string | null>(null);

  // Tooltip state
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Filter major cities to include only those with population > 100,000
  const majorCities = majorCitiesData.filter(
    (city) => city.population > 100000
  );

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
        const { visitedStates, visitedCounties, usExplored } = response.data;
        setVisitedStates(visitedStates);
        setVisitedCounties(visitedCounties);
        setUsExplored(usExplored);
        console.log('Fetched Visited Locations:', {
          visitedStates,
          visitedCounties,
          usExplored,
        });
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
        console.log('Fetched User Photos:', response.data.photos);
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
          await axios.post(
            '/api/user/visited-locations',
            {
              visitedStates: updatedStates,
              visitedCounties: updatedCounties,
            },
            {
              withCredentials: true,
            }
          );
          setUsExplored(calculatedUsExplored);
          toast.success('Visited locations updated successfully!');
          console.log('Visited locations updated:', {
            visitedStates: updatedStates,
            visitedCounties: updatedCounties,
            usExplored: calculatedUsExplored,
          });
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
        setUserPhotos(response.data.photos);
        console.log('User photos updated:', response.data.photos);
      } catch (error) {
        console.error('Error fetching user photos:', error);
        toast.error('Failed to load your photos.');
      }
    };

    fetchUserPhotos();
  };

  // Handler to toggle visited state
  const toggleVisitedState = (stateId: string) => {
    console.log('Clicked State ID:', stateId);
    console.log('Mapped State Name:', stateFIPSToName[stateId]);
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
        .filter(
          (county: GeoFeature) =>
            county.properties?.STATEFP === stateId &&
            !!county.properties?.GEOID
        )
        .map((county: GeoFeature) => county.properties?.GEOID as string);

      updatedCounties[stateId] = stateCounties;
    }

    setVisitedStates(updatedStates);
    setVisitedCounties(updatedCounties);

    // Calculate the new U.S. Explored percentage
    const totalVisitedCounties = Object.values(updatedCounties).reduce(
      (acc, counties) => acc + counties.length,
      0
    );

    const totalCounties = usCountiesGeoJSON.features.filter(
      (county) => county.properties && county.properties.GEOID
    ).length;

    const newUsExplored = parseFloat(
      ((totalVisitedCounties / totalCounties) * 100).toFixed(2)
    );

    updateVisitedLocations(updatedStates, updatedCounties, newUsExplored);
  };

  // Handler to toggle visited county
  const toggleVisitedCounty = (countyId: string, stateId: string) => {
    const countyName = countyGEOIDToName[countyId];
    const stateCounties = visitedCounties[stateId] || [];
    let updatedCounties: string[];
    let updatedStates: string[] = [...visitedStates];

    if (stateCounties.includes(countyId)) {
      // Remove county from visitedCounties
      updatedCounties = stateCounties.filter((id) => id !== countyId);
      toast.info(`County ${countyName || countyId} marked as not visited.`);

      // Update visitedCounties
      const updatedVisitedCounties: { [key: string]: string[] } = {
        ...visitedCounties,
        [stateId]: updatedCounties,
      };

      // If no counties remain visited in the state, remove the state from visitedStates
      if (updatedCounties.length === 0) {
        updatedStates = visitedStates.filter((id) => id !== stateId);
        delete updatedVisitedCounties[stateId];
      }

      setVisitedCounties(updatedVisitedCounties);
      setVisitedStates(updatedStates);

      // Recalculate U.S. Explored percentage
      const totalVisitedCounties = Object.values(updatedVisitedCounties).reduce(
        (acc, counties) => acc + counties.length,
        0
      );

      const totalCounties = usCountiesGeoJSON.features.filter(
        (county) => county.properties && county.properties.GEOID
      ).length;

      const newUsExplored = parseFloat(
        ((totalVisitedCounties / totalCounties) * 100).toFixed(2)
      );

      updateVisitedLocations(updatedStates, updatedVisitedCounties, newUsExplored);
    } else {
      // Add county to visitedCounties
      updatedCounties = [...stateCounties, countyId];
      toast.success(`County ${countyName || countyId} marked as visited.`);

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

      // Recalculate U.S. Explored percentage
      const totalVisitedCounties = Object.values(updatedVisitedCounties).reduce(
        (acc, counties) => acc + counties.length,
        0
      );

      const totalCounties = usCountiesGeoJSON.features.filter(
        (county) => county.properties && county.properties.GEOID
      ).length;

      const newUsExplored = parseFloat(
        ((totalVisitedCounties / totalCounties) * 100).toFixed(2)
      );

      updateVisitedLocations(updatedStates, updatedVisitedCounties, newUsExplored);
    }
  };

  // Calculate the percentage of explored counties in a state
  const calculateStateExploredPercentage = (stateId: string): string => {
    const stateCounties = usCountiesGeoJSON.features.filter(
      (county: GeoFeature) => county.properties?.STATEFP === stateId
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

  // Update the useEffect hook to calculate exploration percentages
  useEffect(() => {
    if (usStatesGeoJSON && usCountiesGeoJSON) {
      // Create a deep copy to avoid mutating the original data
      const updatedStatesGeoJSON = JSON.parse(JSON.stringify(usStatesGeoJSON));

      updatedStatesGeoJSON.features = updatedStatesGeoJSON.features.map(
        (stateFeature: GeoFeature) => {
          const stateId = stateFeature.properties?.STATEFP;
          if (!stateId) {
            console.warn('State feature missing STATEFP:', stateFeature);
            return stateFeature;
          }

          const totalCountiesInState = usCountiesGeoJSON.features.filter(
            (county) => county.properties?.STATEFP === stateId
          ).length;

          const visitedCountiesInState = (visitedCounties[stateId] || []).length;

          const explorationPercentage =
            totalCountiesInState > 0
              ? Number(
                  (
                    (visitedCountiesInState / totalCountiesInState) *
                    100
                  ).toFixed(2)
                )
              : 0;

          return {
            ...stateFeature,
            id: stateId,
            properties: {
              ...stateFeature.properties,
              explorationPercentage,
            },
          };
        }
      );

      setStatesGeoJSONWithPercentages(updatedStatesGeoJSON);
    }
  }, [visitedCounties, usStatesGeoJSON, usCountiesGeoJSON]);

  // Reset zoom to default position
  const resetZoom = () => {
    setViewport({
      latitude: 38,
      longitude: -97,
      zoom: 4,
      bearing: 0,
      pitch: 0,
    });
    setSelectedState(null);
  };

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Click threshold in pixels
  const clickThreshold = 5;

  const handlePointerDown = (event: any) => {
    setIsDragging(false);
    setStartPos({ x: event.point.x, y: event.point.y });
  };

  const handlePointerMove = (event: any) => {
    if (!startPos) return;
    const dx = event.point.x - startPos.x;
    const dy = event.point.y - startPos.y;
    if (Math.abs(dx) > clickThreshold || Math.abs(dy) > clickThreshold) {
      setIsDragging(true);
    }
  };

  // Handle Map Clicks for Layers
  const handleMapClick = (event: any) => {
    if (!mapRef.current || !event.point) return;

    const layersToQuery = selectedState
      ? ['counties-layer', 'states-layer']
      : ['states-layer'];

    const features = mapRef.current.queryRenderedFeatures(event.point, {
      layers: layersToQuery,
    });

    if (!features || features.length === 0) return;

    const feature = features[0];

    if (feature.layer.id === 'states-layer') {
      const stateId = feature.properties?.STATEFP;
      if (stateId) {
        // Zoom into the state and display counties
        setSelectedState(stateId);

        // Zoom into the state
        const stateFeature = usStatesGeoJSON.features.find(
          (feature: GeoFeature) => feature.properties?.STATEFP === stateId
        );

        if (stateFeature) {
          const [minLng, minLat, maxLng, maxLat] = bbox(stateFeature);
          mapRef.current?.fitBounds(
            [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
            { padding: 20 }
          );
        }
      }
    } else if (feature.layer.id === 'counties-layer') {
      const countyId = feature.properties?.GEOID;
      const stateId = feature.properties?.STATEFP;
      if (countyId && stateId) {
        toggleVisitedCounty(countyId, stateId);
      }
    }
  };

  // Hover Effects
  const onStateMouseEnter = (e: any) => {
    if (e.features.length > 0) {
      if (hoveredStateId) {
        mapRef.current?.setFeatureState(
          { source: 'states', id: hoveredStateId },
          { hover: false }
        );
      }
      const id = e.features[0].properties.STATEFP;
      setHoveredStateId(id);
      mapRef.current?.setFeatureState(
        { source: 'states', id },
        { hover: true }
      );
    }
  };

  const onStateMouseLeave = () => {
    if (hoveredStateId) {
      mapRef.current?.setFeatureState(
        { source: 'states', id: hoveredStateId },
        { hover: false }
      );
    }
    setHoveredStateId(null);
  };

  const onCountyMouseEnter = (e: any) => {
    if (e.features.length > 0) {
      if (hoveredCountyId) {
        mapRef.current?.setFeatureState(
          { source: 'counties', id: hoveredCountyId },
          { hover: false }
        );
      }
      const id = e.features[0].properties.GEOID;
      setHoveredCountyId(id);
      mapRef.current?.setFeatureState(
        { source: 'counties', id },
        { hover: true }
      );
      const countyName = e.features[0].properties.NAME;
      setTooltipContent(countyName);
      setTooltipPosition({ x: e.point.x, y: e.point.y });
    }
  };

  const onCountyMouseLeave = () => {
    if (hoveredCountyId) {
      mapRef.current?.setFeatureState(
        { source: 'counties', id: hoveredCountyId },
        { hover: false }
      );
    }
    setHoveredCountyId(null);
    setTooltipContent(null);
    setTooltipPosition(null);
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

        {/* Main Content */}
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Top Right Controls */}
          <div className="flex justify-end items-center space-x-4 mb-4">
            {/* Upload Photo Icon */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="text-gray-800 dark:text-gray-200 hover:text-green-500 dark:hover:text-green-400"
            >
              <FiUpload size={24} />
            </button>

            {/* Dark Mode Toggle Icon */}
            <button
              onClick={toggleDarkMode}
              className="text-gray-800 dark:text-gray-200 hover:text-green-500 dark:hover:text-green-400"
            >
              {isDarkMode ? <FiSun size={24} /> : <FiMoon size={24} />}
            </button>
          </div>

          {/* Map and Stats */}
          <div className="flex flex-col lg:flex-row">
            {/* Map Container */}
            <div className="flex-1 h-[80vh] mb-4 lg:mb-0 lg:mr-4">
              <div className="w-full h-full relative">
                <ReactMapGL
                  {...viewport}
                  ref={mapRef}
                  mapStyle={
                    isDarkMode
                      ? 'mapbox://styles/mapbox/dark-v10'
                      : 'mapbox://styles/mapbox/light-v10'
                  }
                  mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
                  onMove={(evt) => setViewport(evt.viewState)}
                  onMouseDown={handlePointerDown}
                  onMouseMove={(event) => {
                    handlePointerMove(event);
                    if (!mapRef.current) return;

                    const features = mapRef.current.queryRenderedFeatures(event.point, {
                      layers: selectedState ? ['counties-layer'] : ['states-layer'],
                    });

                    if (features && features.length > 0) {
                      if (selectedState) {
                        onCountyMouseEnter({ features, point: event.point });
                      } else {
                        onStateMouseEnter({ features, point: event.point });
                      }
                    } else {
                      if (selectedState) {
                        onCountyMouseLeave();
                      } else {
                        onStateMouseLeave();
                      }
                    }
                  }}
                  onMouseUp={(event) => {
                    if (!isDragging) {
                      handleMapClick(event);
                    }
                    setIsDragging(false);
                    setStartPos(null);
                  }}
                  onMouseLeave={() => {
                    if (selectedState) {
                      onCountyMouseLeave();
                    } else {
                      onStateMouseLeave();
                    }
                  }}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={(event) => {
                    if (!isDragging) {
                      handleMapClick(event);
                    }
                    setIsDragging(false);
                    setStartPos(null);
                  }}
                  interactiveLayerIds={['states-layer', 'counties-layer']}
                >
                  {/* Navigation Control */}
                  <NavigationControl
                    style={{ right: 10, top: 10 }}
                    showCompass={false}
                  />

                  {/* States Layer */}
                  {statesGeoJSONWithPercentages && (
                    <Source
                      id="states"
                      type="geojson"
                      data={{
                        ...statesGeoJSONWithPercentages,
                        features: statesGeoJSONWithPercentages.features.map(
                          (feature: GeoFeature) => ({
                            ...feature,
                            id: feature.properties?.STATEFP,
                          })
                        ),
                      }}
                    >
                      <Layer
                        id="states-layer"
                        type="fill"
                        paint={{
                          'fill-color': [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            '#FFD700', // Gold color when hovered
                            [
                              'interpolate',
                              ['linear'],
                              ['number', ['get', 'explorationPercentage'], 0],
                              0,
                              '#f0f9e8',
                              25,
                              '#ccebc5',
                              50,
                              '#7bccc4',
                              75,
                              '#2b8cbe',
                              100,
                              '#084081',
                            ],
                          ],
                          'fill-outline-color': '#FFFFFF',
                          'fill-opacity': 0.8,
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
                        features: usCountiesGeoJSON.features
                          .filter(
                            (feature: GeoFeature) =>
                              feature.properties?.STATEFP === selectedState
                          )
                          .map((feature: GeoFeature) => ({
                            ...feature,
                            id: feature.properties?.GEOID,
                          })),
                      }}
                    >
                      <Layer
                        id="counties-layer"
                        type="fill"
                        paint={{
                          'fill-color': [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            '#FFD700', // Gold color when hovered
                            [
                              'case',
                              [
                                'in',
                                ['get', 'GEOID'],
                                ['literal', visitedCounties[selectedState] || []],
                              ],
                              VISITED_COLOR, // Visited county color
                              UNVISITED_COLOR, // Unvisited county color
                            ],
                          ],
                          'fill-outline-color': '#FFFFFF',
                          'fill-opacity': 0.6,
                        }}
                      />
                    </Source>
                  )}

                  {/* Major Cities Markers */}
                  {majorCities
                    .filter(
                      (city) =>
                        !selectedState || city.stateId === selectedState
                    )
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

                  {/* Tooltip for County Names */}
                  {tooltipContent && tooltipPosition && (
                    <div
                      className="tooltip"
                      style={{
                        position: 'absolute',
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        color: '#fff',
                        padding: '5px',
                        borderRadius: '3px',
                        pointerEvents: 'none',
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      {tooltipContent}
                    </div>
                  )}

                  {/* Adjust label visibility */}
                  <Layer
                    id="settlement-label"
                    source="composite"
                    sourceLayer="settlement"
                    type="symbol"
                    layout={{
                      'text-field': ['get', 'name_en'],
                      'text-size': 12,
                    }}
                    paint={{
                      'text-color': '#000000',
                      'text-halo-color': '#FFFFFF',
                      'text-halo-width': 1,
                    }}
                  />
                </ReactMapGL>

                {/* Map Legend */}
                <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-700 p-4 rounded shadow">
                  <h4 className="font-bold mb-2">Exploration Legend</h4>
                  <div className="flex items-center">
                    <span className="w-4 h-4 bg-[#f0f9e8] mr-2"></span> 0%
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 bg-[#ccebc5] mr-2"></span> 25%
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 bg-[#7bccc4] mr-2"></span> 50%
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 bg-[#2b8cbe] mr-2"></span> 75%
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 bg-[#084081] mr-2"></span> 100%
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Panel */}
            <div className="w-full lg:w-80 bg-white shadow rounded-lg p-6 dark:bg-gray-800">
              <h2 className="text-2xl font-semibold text-green-700 mb-4 text-center dark:text-green-300">
                {selectedState
                  ? `${stateFIPSToName[selectedState]} Travel Stats`
                  : sessionData?.user?.name
                  ? `${sessionData.user.name}'s Travel Stats`
                  : 'Your Travel Stats'}
              </h2>
              {selectedState === null ? (
                <div className="space-y-4">
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
                <div className="space-y-4">
                  <p className="text-lg text-gray-700 dark:text-gray-200">
                    Counties Visited in {stateFIPSToName[selectedState]}:{' '}
                    <span className="font-bold text-green-700 dark:text-green-300">
                      {(visitedCounties[selectedState] || []).length}
                    </span>
                    {' / '}
                    <span className="font-bold text-green-700 dark:text-green-300">
                      {
                        usCountiesGeoJSON.features.filter(
                          (county: GeoFeature) =>
                            county.properties?.STATEFP === selectedState
                        ).length
                      }
                    </span>
                  </p>
                  <p className="text-lg text-gray-700 dark:text-gray-200">
                    {stateFIPSToName[selectedState]} Explored:{' '}
                    <span className="font-bold text-green-700 dark:text-green-300">
                      {calculateStateExploredPercentage(selectedState)}%
                    </span>
                  </p>
                  <button
                    onClick={resetZoom}
                    className="mt-4 w-full bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 transition-colors duration-200 dark:bg-green-600 dark:hover:bg-green-500"
                  >
                    Back to U.S. Map
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Photo Upload Modal */}
        <Transition appear show={isUploadModalOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setIsUploadModalOpen(false)}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div
                className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-75"
                aria-hidden="true"
              />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex items-center justify-center min-h-full px-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
                    <button
                      onClick={() => setIsUploadModalOpen(false)}
                      className="absolute top-3 right-3 text-gray-800 dark:text-gray-200 hover:text-red-500"
                    >
                      &times;
                    </button>
                    <Dialog.Title
                      as="h2"
                      className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200"
                    >
                      Upload a Photo
                    </Dialog.Title>
                    <PhotoUpload onUploadSuccess={handlePhotoUploadSuccess} />
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
    </div>
  );
}
