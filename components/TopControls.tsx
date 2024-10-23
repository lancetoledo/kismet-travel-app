import React, { useContext } from 'react';
import { FiMoon, FiSun, FiUpload } from 'react-icons/fi';
import { MapContext } from '../context/MapContext';

interface TopControlsProps {
  openUploadModal: () => void;
}

const TopControls: React.FC<TopControlsProps> = ({ openUploadModal }) => {
  const { isDarkMode, toggleDarkMode } = useContext(MapContext);

  return (
    <div className="flex justify-end items-center space-x-4 mb-4">
      {/* Upload Photo Icon */}
      <button
        onClick={openUploadModal}
        className="text-gray-800 dark:text-gray-200 hover:text-green-500 dark:hover:text-green-400"
        aria-label="Upload Photo"
      >
        <FiUpload size={24} />
      </button>

      {/* Dark Mode Toggle Icon */}
      <button
        onClick={toggleDarkMode}
        className="text-gray-800 dark:text-gray-200 hover:text-green-500 dark:hover:text-green-400"
        aria-label="Toggle Dark Mode"
      >
        {isDarkMode ? <FiSun size={24} /> : <FiMoon size={24} />}
      </button>
    </div>
  );
};

export default TopControls;
