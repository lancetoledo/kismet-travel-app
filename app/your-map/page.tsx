// File: /app/your-map/page.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import debounce from 'lodash.debounce';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import data files
import usStatesGeoJSON from '../../data/usStatesFeatureCollection.json';
import usCountiesGeoJSON from '../../data/usCountiesFeatureCollection.json';

// Import components
import Header from '../../components/Header';
import PhotoUpload from '../../components/PhotoUpload';
import MapComponent from '../../components/Map';
import StatsPanel from '../../components/StatsPanel';
import TopControls from '../../components/TopControls';

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
}

interface GeoFeature extends GeoJSON.Feature<GeoJSON.Geometry, GeoFeatureProperties> {}

export default function YourMapPage() {
  // State variables with explicit types
  const [viewport, setViewport] = useState({
    latitude: 38,
    longitude: -97,
    zoom: 4,
    bearing: 0,
    pitch: 0,
  });
  const [visitedStates, setVisitedStates] = useState<string[]>([]);
  const [visitedCounties, setVisitedCounties] = useState<{ [stateId: string]: string[] }>({});
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [usExplored, setUsExplored] = useState<number>(0); // U.S. Explored percentage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // Default to dark mode
  const [userPhotos, setUserPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false); // For upload modal

  const { data: sessionData } = useSession();

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
          <TopControls
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            openUploadModal={() => setIsUploadModalOpen(true)}
          />

          {/* Map and Stats */}
          <div className="flex flex-col lg:flex-row">
            {/* Map Container */}
            <div className="flex-1 h-[80vh] mb-4 lg:mb-0 lg:mr-4">
              <MapComponent
                viewport={viewport}
                setViewport={setViewport}
                isDarkMode={isDarkMode}
                visitedStates={visitedStates}
                visitedCounties={visitedCounties}
                setVisitedStates={setVisitedStates}
                setVisitedCounties={setVisitedCounties}
                selectedState={selectedState}
                setSelectedState={setSelectedState}
                userPhotos={userPhotos}
                selectedPhoto={selectedPhoto}
                setSelectedPhoto={setSelectedPhoto}
                stateFIPSToName={stateFIPSToName}
                countyGEOIDToName={countyGEOIDToName}
                toggleVisitedState={toggleVisitedState}
                usCountiesGeoJSON={usCountiesGeoJSON}
                updateVisitedLocations={updateVisitedLocations}
              />
            </div>

            {/* Stats Panel */}
            <StatsPanel
              selectedState={selectedState}
              visitedStates={visitedStates}
              visitedCounties={visitedCounties}
              usExplored={usExplored}
              stateFIPSToName={stateFIPSToName}
              calculateStateExploredPercentage={calculateStateExploredPercentage}
              resetZoom={resetZoom}
              usCountiesGeoJSON={usCountiesGeoJSON}
              userName={sessionData?.user?.name || null}
            />
          </div>
        </div>

        {/* Photo Upload Modal */}
        {isUploadModalOpen && (
          <PhotoUpload
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onUploadSuccess={handlePhotoUploadSuccess}
          />
        )}
      </div>
    </div>
  );
}
