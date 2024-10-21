// File: /components/PhotoUpload.tsx

import React, { useState, ChangeEvent, Fragment } from 'react';
import EXIF from 'exif-js';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import { LoadScript, StandaloneSearchBox } from '@react-google-maps/api';
import { toast } from 'react-toastify';

interface PhotoUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void; // Optional callback after successful upload
}

const libraries = ['places'];

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  // State variables with explicit types
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [location, setLocation] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const searchBoxRef = React.useRef<any>(null);

  // Handle file selection
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadError(null);

    // Generate a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewSrc(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Extract EXIF data
    EXIF.getData(file, function () {
      const lat = EXIF.getTag(this, 'GPSLatitude');
      const lon = EXIF.getTag(this, 'GPSLongitude');
      const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
      const lonRef = EXIF.getTag(this, 'GPSLongitudeRef');

      if (lat && lon && latRef && lonRef) {
        const parsedLatitude = convertDMSToDD(lat as number[], latRef as string);
        const parsedLongitude = convertDMSToDD(lon as number[], lonRef as string);
        setLatitude(parsedLatitude);
        setLongitude(parsedLongitude);
      } else {
        console.log('No EXIF GPS data found.');
      }
    });
  };

  // Helper function to convert DMS to Decimal Degrees
  const convertDMSToDD = (dms: number[], ref: string): number => {
    const degrees = dms[0];
    const minutes = dms[1];
    const seconds = dms[2];
    let dd = degrees + minutes / 60 + seconds / 3600;
    if (ref === 'S' || ref === 'W') {
      dd = dd * -1;
    }
    return dd;
  };

  // Handle manual input of latitude and longitude
  const handleLatitudeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    setLatitude(isNaN(value) ? null : value);
  };

  const handleLongitudeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    setLongitude(isNaN(value) ? null : value);
  };

  // Handle description change
  const handleDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.target.value);
  };

  // Handle place selection from the autocomplete search box
  const handlePlaceChanged = () => {
    const places = searchBoxRef.current.getPlaces();
    if (places && places.length > 0) {
      const place = places[0];
      if (place.geometry) {
        const name = place.formatted_address || place.name;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setLocation({ name, lat, lng });
        setLatitude(lat);
        setLongitude(lng);
      }
    }
  };

  // Handle photo upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a photo to upload.');
      return;
    }

    if (latitude === null || longitude === null) {
      setUploadError('Please provide a location or select a photo with location data.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);
      formData.append('description', description);
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      if (location && location.name) {
        formData.append('locationName', location.name);
      }

      const response = await axios.post('/api/photos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('Photo uploaded successfully!');
        // Reset form
        setSelectedFile(null);
        setPreviewSrc(null);
        setDescription('');
        setLatitude(null);
        setLongitude(null);
        setLocation(null);
        if (onUploadSuccess) onUploadSuccess();
        onClose();
      } else {
        setUploadError(response.data.error || 'Failed to upload photo.');
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      setUploadError(error.response?.data?.error || 'An unexpected error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                  onClick={onClose}
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

                {/* Photo Upload Form */}
                <div className="mb-4">
                  <label className="block text-gray-700 dark:text-gray-200 mb-2">
                    Select Photo:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  />
                </div>

                {previewSrc && (
                  <div className="mb-4">
                    <img
                      src={previewSrc}
                      alt="Preview"
                      className="w-64 h-64 object-cover rounded"
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-gray-700 dark:text-gray-200 mb-2">
                    Description:
                  </label>
                  <textarea
                    value={description}
                    onChange={handleDescriptionChange}
                    className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    placeholder="Enter a description for your photo..."
                  />
                </div>

                {/* Location Search */}
                <div className="mb-4">
                  <label className="block text-gray-700 dark:text-gray-200 mb-2">
                    Location (optional):
                  </label>
                  <LoadScript
                    googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ''}
                    libraries={libraries}
                  >
                    <StandaloneSearchBox
                      onLoad={(ref) => (searchBoxRef.current = ref)}
                      onPlacesChanged={handlePlaceChanged}
                    >
                      <input
                        type="text"
                        placeholder="Search for a location"
                        className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                      />
                    </StandaloneSearchBox>
                  </LoadScript>
                  {location && (
                    <div className="mt-2 text-green-700 dark:text-green-300">
                      Selected Location: {location.name}
                    </div>
                  )}
                </div>

                {/* Latitude and Longitude Inputs */}
                <div className="mb-4">
                  <label className="block text-gray-700 dark:text-gray-200 mb-2">
                    Latitude (auto-detected from photo or location search):
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude !== null ? latitude : ''}
                    onChange={handleLatitudeChange}
                    className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    placeholder="e.g., 37.7749"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 dark:text-gray-200 mb-2">
                    Longitude (auto-detected from photo or location search):
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude !== null ? longitude : ''}
                    onChange={handleLongitudeChange}
                    className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    placeholder="e.g., -122.4194"
                  />
                </div>

                {uploadError && (
                  <div className="mb-4 text-red-600 dark:text-red-400">
                    {uploadError}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className={`w-full bg-green-700 text-white py-2 px-4 rounded hover:bg-green-800 transition-colors duration-200 ${
                    isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUploading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PhotoUpload;
