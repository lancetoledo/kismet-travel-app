// File: /components/Map.tsx

import React, { useState, useEffect, useRef } from 'react';
import ReactMapGL, {
  Marker as MapboxMarker,
  Source,
  Layer,
  NavigationControl,
  Popup,
  MapRef,
  ViewState,
} from 'react-map-gl';
import bbox from '@turf/bbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { toast } from 'react-toastify';

// Import data files
import majorCitiesData from '../data/majorCities.json';

// Import GeoJSON data
import usStatesGeoJSON from '../data/usStatesFeatureCollection.json';
import usCountiesGeoJSON from '../data/usCountiesFeatureCollection.json';

// Define TypeScript interfaces
interface Photo {
  _id: string;
  userId: string;
  photoUrl: string;
  thumbnailUrl: string;
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
    name?: string; // Optional location name
  };
  description: string;
  createdAt: string;
}

interface GeoFeatureProperties {
  STATEFP?: string;
  GEOID?: string;
  NAME?: string;
  explorationPercentage?: number;
  class?: string; // For filtering label types
}

interface GeoFeature extends GeoJSON.Feature<GeoJSON.Geometry, GeoFeatureProperties> {}

interface MapComponentProps {
  viewport: ViewState;
  setViewport: React.Dispatch<React.SetStateAction<ViewState>>;
  isDarkMode: boolean;
  visitedStates: string[];
  visitedCounties: { [stateId: string]: string[] };
  setVisitedStates: React.Dispatch<React.SetStateAction<string[]>>;
  setVisitedCounties: React.Dispatch<React.SetStateAction<{ [stateId: string]: string[] }>>;
  selectedState: string | null;
  setSelectedState: React.Dispatch<React.SetStateAction<string | null>>;
  userPhotos: Photo[];
  selectedPhoto: Photo | null;
  setSelectedPhoto: React.Dispatch<React.SetStateAction<Photo | null>>;
  stateFIPSToName: { [key: string]: string };
  countyGEOIDToName: { [key: string]: string };
  usCountiesGeoJSON: any;
  updateVisitedLocations: (
    updatedStates: string[],
    updatedCounties: { [key: string]: string[] },
    newUsExplored: number
  ) => void;
}

const VISITED_COLOR = '#08519c'; // Dark blue for visited counties
const UNVISITED_COLOR = '#bdd7e7'; // Light blue for unvisited counties

const MapComponent: React.FC<MapComponentProps> = ({
  viewport,
  setViewport,
  isDarkMode,
  visitedStates,
  visitedCounties,
  setVisitedStates,
  setVisitedCounties,
  selectedState,
  setSelectedState,
  userPhotos,
  selectedPhoto,
  setSelectedPhoto,
  stateFIPSToName,
  countyGEOIDToName,
  usCountiesGeoJSON,
  updateVisitedLocations,
}) => {
  const mapRef = useRef<MapRef>(null);

  // State variables for tracking mouse events
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  // Hover state variables
  const [hoveredStateId, setHoveredStateId] = useState<string | null>(null);
  const [hoveredCountyId, setHoveredCountyId] = useState<string | null>(null);

  // Tooltip state
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const majorCities = majorCitiesData.filter(
    (city) => city.population > 100000
  );

  // State for statesGeoJSON with exploration percentages
  const [statesGeoJSONWithPercentages, setStatesGeoJSONWithPercentages] = useState<any>(null);

  // Calculate exploration percentages when visitedCounties change
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
  }, [visitedCounties]);

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
        // If state is already selected, toggle visited state
        if (selectedState === stateId) {
          toggleVisitedState(stateId);
        } else {
          // Zoom into the selected state
          const selectedStateFeature = usStatesGeoJSON.features.find(
            (f: GeoFeature) => f.properties?.STATEFP === stateId
          );

          if (selectedStateFeature) {
            const [minLng, minLat, maxLng, maxLat] = bbox(selectedStateFeature);
            const padding = 20; // Adjust as needed
            mapRef.current?.fitBounds(
              [
                [minLng, minLat],
                [maxLng, maxLat],
              ],
              {
                padding: padding,
                duration: 1000,
              }
            );
            setSelectedState(stateId);
          }
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
      const stateName = e.features[0].properties.NAME;
      const explorationPercentage = e.features[0].properties.explorationPercentage;
      setHoveredStateId(id);
      mapRef.current?.setFeatureState(
        { source: 'states', id },
        { hover: true }
      );
      setTooltipContent(`${stateName}: ${explorationPercentage}% Explored`);
      setTooltipPosition({ x: e.point.x, y: e.point.y });
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
    setTooltipContent(null);
    setTooltipPosition(null);
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
      const countyName = e.features[0].properties.NAME;
      setHoveredCountyId(id);
      mapRef.current?.setFeatureState(
        { source: 'counties', id },
        { hover: true }
      );
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

  // Handler to toggle visited state (if needed)
  const toggleVisitedState = (stateId: string) => {
    // Implement toggling logic if required
    // For example, mark all counties in the state as visited or not
    // This function was referenced in handleMapClick but not defined
    // You may need to implement it based on your application logic
    toast.info(`State ${stateFIPSToName[stateId] || stateId} toggled.`);
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

  return (
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
            layers: selectedState ? ['counties-layer', 'states-layer'] : ['states-layer'],
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
            data={statesGeoJSONWithPercentages}
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
                    ['get', 'explorationPercentage'],
                    0,
                    '#bdd7e7', // Lightest blue for 0%
                    25,
                    '#6baed6', // Light blue for 25%
                    50,
                    '#3182bd', // Medium blue for 50%
                    75,
                    '#08519c', // Dark blue for 75%
                    100,
                    '#08306b', // Darkest blue for 100%
                  ],
                ],
                'fill-outline-color': '#FFFFFF',
                'fill-opacity': 0.7, // Increased opacity for better visibility
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
                'fill-opacity': 0.7, // Increased opacity for better visibility
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
                  height="12"
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
              role="button"
              aria-label={`View photo: ${photo.description}`}
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setSelectedPhoto(photo);
                }
              }}
            >
              <img
                src={photo.thumbnailUrl}
                alt="User Photo"
                className="rounded-full w-8 h-8 border-2 border-white shadow-lg"
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
              {selectedPhoto.location.name && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {selectedPhoto.location.name}
                </p>
              )}
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
              padding: '5px 8px',
              borderRadius: '3px',
              pointerEvents: 'none',
              transform: 'translate(-50%, -100%)',
              whiteSpace: 'nowrap',
              fontSize: '12px',
              zIndex: 10,
            }}
          >
            {tooltipContent}
          </div>
        )}

        {/* Label Layers */}
        {/* Township Labels */}
        <Layer
          id="township-labels"
          type="symbol"
          source="composite"
          source-layer="place_label" // Ensure this is correct based on your Mapbox style
          filter={['==', ['get', 'class'], 'township']} // Adjust based on actual data
          layout={{
            'text-field': ['get', 'name_en'],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-offset': [0, 0.6],
            'text-anchor': 'center',
            'text-allow-overlap': false, // Prevent overlapping labels
          }}
          paint={{
            'text-color': isDarkMode ? '#FFFFFF' : '#000000',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1, // Reduced from 2 to 1
            'text-halo-blur': 0.5, // Reduced from 1 to 0.5
          }}
        />

        {/* City Labels */}
        <Layer
          id="city-labels"
          type="symbol"
          source="composite"
          source-layer="place_label" // Ensure this is correct based on your Mapbox style
          filter={['==', ['get', 'class'], 'city']} // Filter for city labels
          layout={{
            'text-field': ['get', 'name_en'],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4,
              12,
              10,
              16,
            ],
            'text-offset': [0, 0.6],
            'text-anchor': 'center',
            'text-allow-overlap': false, // Prevent overlapping labels
          }}
          paint={{
            'text-color': isDarkMode ? '#FFFFFF' : '#000000',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1, // Reduced from 2 to 1
            'text-halo-blur': 0.5, // Reduced from 1 to 0.5
          }}
        />

        {/* State Labels */}
        <Layer
          id="state-labels"
          type="symbol"
          source="composite"
          source-layer="admin_label" // Changed to 'admin_label' for state labels
          filter={['==', ['get', 'admin_level'], 1]} // Adjust filter based on actual data
          layout={{
            'text-field': ['get', 'name_en'],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 14,
            'text-offset': [0, 0.6],
            'text-anchor': 'center',
            'text-allow-overlap': false, // Prevent overlapping labels
          }}
          paint={{
            'text-color': isDarkMode ? '#FFFFFF' : '#000000',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1, // Reduced from 2 to 1
            'text-halo-blur': 0.5, // Reduced from 1 to 0.5
          }}
        />
      </ReactMapGL>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-700 p-4 rounded shadow">
        <h4 className="font-bold mb-2 text-gray-800 dark:text-gray-200">Exploration Legend</h4>
        <div className="flex items-center mb-1">
          <span className="w-4 h-4 bg-[#bdd7e7] mr-2 border border-gray-300 rounded"></span> 0%
        </div>
        <div className="flex items-center mb-1">
          <span className="w-4 h-4 bg-[#6baed6] mr-2 border border-gray-300 rounded"></span> 25%
        </div>
        <div className="flex items-center mb-1">
          <span className="w-4 h-4 bg-[#3182bd] mr-2 border border-gray-300 rounded"></span> 50%
        </div>
        <div className="flex items-center mb-1">
          <span className="w-4 h-4 bg-[#08519c] mr-2 border border-gray-300 rounded"></span> 75%
        </div>
        <div className="flex items-center mb-2">
          <span className="w-4 h-4 bg-[#08306b] mr-2 border border-gray-300 rounded"></span> 100%
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 bg-[#FFD700] mr-2 border border-gray-300 rounded"></span> Hovered
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
