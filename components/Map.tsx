// File: /components/Map.tsx

import React, { useState, useEffect, useRef, useContext } from 'react';
import ReactMapGL, {
  Source,
  Layer,
  NavigationControl,
  Popup,
  MapRef,
} from 'react-map-gl';
import bbox from '@turf/bbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// Import contexts
import { MapContext } from '../context/MapContext';
import { VisitedContext } from '../context/VisitedContext';
import { PhotoContext } from '../context/PhotoContext';

// Import data files
import majorCitiesData from '../data/majorCities.json';
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

const VISITED_COLOR = '#08519c'; // Dark blue for visited counties
const UNVISITED_COLOR = '#bdd7e7'; // Light blue for unvisited counties

const MapComponent: React.FC = () => {
  const mapRef = useRef<MapRef>(null);

  // Access context values
  const { viewport, setViewport, selectedState, setSelectedState, isDarkMode } = useContext(MapContext);
  const { visitedStates, visitedCounties, updateVisitedLocations } = useContext(VisitedContext);
  const { userPhotos } = useContext(PhotoContext);

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

  // Map state FIPS codes to state names
  const stateFIPSToName: { [key: string]: string } = {};
  usStatesGeoJSON.features.forEach((feature: GeoFeature) => {
    const stateId = feature.properties?.STATEFP;
    const stateName = feature.properties?.NAME;
    if (stateId && stateName) {
      stateFIPSToName[stateId] = stateName;
    }
  });

  // Map county GEOIDs to names
  const countyGEOIDToName: { [key: string]: string } = {};
  usCountiesGeoJSON.features.forEach((feature: GeoFeature) => {
    const countyId = feature.properties?.GEOID;
    const countyName = feature.properties?.NAME;
    if (countyId && countyName) {
      countyGEOIDToName[countyId] = countyName;
    }
  });

  // State for selected photo
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // Create GeoJSON data from userPhotos
  const [photoGeoJSON, setPhotoGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    if (userPhotos && userPhotos.length > 0) {
      const features = userPhotos.map((photo) => ({
        type: 'Feature',
        properties: {
          photoId: photo._id,
          thumbnailUrl: photo.thumbnailUrl,
          description: photo.description,
          // Add any other properties you need
        },
        geometry: {
          type: 'Point',
          coordinates: photo.location.coordinates, // [longitude, latitude]
        },
      }));

      setPhotoGeoJSON({
        type: 'FeatureCollection',
        features,
      });
    }
  }, [userPhotos]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.loadImage('/icons/photo-icon.png', (error, image) => {
        if (error) throw error;
        if (!mapRef.current.hasImage('photo-icon')) {
          mapRef.current.addImage('photo-icon', image);
        }
      });
    }
  }, [mapRef.current]);

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
  };

  // Handler to toggle visited county
  const toggleVisitedCounty = (countyId: string, stateId: string) => {
    // Implement your logic here to toggle the visited state of a county
    // Similar to the original code
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
        onClick={handleMapClick}
        interactiveLayerIds={['clusters', 'unclustered-point', 'states-layer', 'counties-layer']}
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
      >
        {/* Navigation Control */}
        <NavigationControl style={{ right: 10, top: 10 }} showCompass={false} />

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

        {/* Clustering of Photos */}
        {photoGeoJSON && (
          <Source
            id="photos"
            type="geojson"
            data={photoGeoJSON}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            {/* Clustered Circles */}
            <Layer
              id="clusters"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': [
                  'step',
                  ['get', 'point_count'],
                  '#51bbd6',
                  100,
                  '#f1f075',
                  750,
                  '#f28cb1',
                ],
                'circle-radius': [
                  'step',
                  ['get', 'point_count'],
                  20,
                  100,
                  30,
                  750,
                  40,
                ],
              }}
            />

            {/* Cluster Count Symbols */}
            <Layer
              id="cluster-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12,
              }}
              paint={{
                'text-color': '#ffffff',
              }}
            />

            {/* Unclustered Point Symbols */}
            <Layer
              id="unclustered-point"
              type="symbol"
              filter={['!', ['has', 'point_count']]}
              minzoom={10}
              layout={{
                'icon-image': 'photo-icon',
                'icon-size': 0.5,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
              }}
            />
          </Source>
        )}

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

        {/* Tooltip for State/County Names */}
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
      </ReactMapGL>
    </div>
  );
};

export default MapComponent;
