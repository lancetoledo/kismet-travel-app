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

interface MapComponentProps {
  viewport: ViewState;
  setViewport: React.Dispatch<React.SetStateAction<ViewState>>;
  isDarkMode: boolean;
  visitedStates: string[];
  visitedCounties: { [stateId: string]: string[] };
  selectedState: string | null;
  setSelectedState: React.Dispatch<React.SetStateAction<string | null>>;
  userPhotos: Photo[];
  selectedPhoto: Photo | null;
  setSelectedPhoto: React.Dispatch<React.SetStateAction<Photo | null>>;
  stateFIPSToName: { [key: string]: string };
  countyGEOIDToName: { [key: string]: string };
  toggleVisitedCounty: (countyId: string, stateId: string) => void;
  toggleVisitedState: (stateId: string) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  viewport,
  setViewport,
  isDarkMode,
  visitedStates,
  visitedCounties,
  selectedState,
  setSelectedState,
  userPhotos,
  selectedPhoto,
  setSelectedPhoto,
  stateFIPSToName,
  countyGEOIDToName,
  toggleVisitedCounty,
  toggleVisitedState,
}) => {
  const mapRef = useRef<MapRef>(null);

  // State variables for tracking mouse events
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(
    null
  );

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

  // Update statesGeoJSON with exploration percentages
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

  // Rest of your MapComponent code remains the same...

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
                    '#2e7d32', // Visited county color
                    '#a5d6a7', // Unvisited county color
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

        {/* Label Layers */}
        {/* State Labels */}
        <Layer
          id="state-labels"
          type="symbol"
          source="composite"
          sourceLayer="state_label" // Adjust based on your map style
          layout={{
            'text-field': ['get', 'name_en'],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 14,
          }}
          paint={{
            'text-color': '#FFFFFF',
            'text-halo-color': '#000000',
            'text-halo-width': 1,
          }}
        />

        {/* City Labels */}
        <Layer
          id="city-labels"
          type="symbol"
          source="composite"
          sourceLayer="place_label" // Adjust based on your map style
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
          }}
          paint={{
            'text-color': '#FFFFFF',
            'text-halo-color': '#000000',
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
  );
};

export default MapComponent;
