'use client';

import React, { useState, useContext } from 'react';
import { useSession } from 'next-auth/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import contexts
import { PhotoProvider } from '../../context/PhotoContext';
import { MapProvider, MapContext } from '../../context/MapContext';
import { VisitedProvider } from '../../context/VisitedContext';

// Import components
import Header from '../../components/Header';
import PhotoUpload from '../../components/PhotoUpload';
import MapComponent from '../../components/Map';
import StatsPanel from '../../components/StatsPanel';
import TopControls from '../../components/TopControls';

export default function YourMapPage() {
  const { data: sessionData } = useSession();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Loading and error handling can stay here if needed

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
    <PhotoProvider>
      <MapProvider>
        <VisitedProvider>
          <Content
            isUploadModalOpen={isUploadModalOpen}
            setIsUploadModalOpen={setIsUploadModalOpen}
            userName={sessionData?.user?.name || null}
          />
        </VisitedProvider>
      </MapProvider>
    </PhotoProvider>
  );
}

interface ContentProps {
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userName: string | null;
}

function Content({ isUploadModalOpen, setIsUploadModalOpen, userName }: ContentProps) {
  const { isDarkMode } = useContext(MapContext);

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
          <TopControls openUploadModal={() => setIsUploadModalOpen(true)} />

          {/* Map and Stats */}
          <div className="flex flex-col lg:flex-row">
            {/* Map Container */}
            <div className="flex-1 h-[80vh] mb-4 lg:mb-0 lg:mr-4">
              <MapComponent />
            </div>

            {/* Stats Panel */}
            <StatsPanel userName={userName} />
          </div>
        </div>

        {/* Photo Upload Modal */}
        {isUploadModalOpen && (
          <PhotoUpload
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
