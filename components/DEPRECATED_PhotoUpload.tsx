// File: /components/PhotoUpload.tsx

import React, { useState, ChangeEvent } from 'react';
import EXIF from 'exif-js';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';

interface PhotoUploadProps {
  onUploadSuccess?: () => void; // Optional callback after successful upload
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onUploadSuccess }) => {
  // State variables with explicit types
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  // Handle manual input of latitude
  const handleLatitudeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    setLatitude(isNaN(value) ? null : value);
  };

  // Handle manual input of longitude
  const handleLongitudeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    setLongitude(isNaN(value) ? null : value);
  };

  // Handle description change
  const handleDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.target.value);
  };

  // Handle photo upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a photo to upload.');
      return;
    }

    if (latitude === null || longitude === null) {
      setUploadError('Please provide valid latitude and longitude.');
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
        if (onUploadSuccess) onUploadSuccess();
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
    <div className="bg-white shadow rounded-lg p-6 mb-8 dark:bg-gray-800">
      <h2 className="text-2xl font-semibold text-green-700 mb-4 dark:text-green-300">
        Upload a Photo
      </h2>
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-200 mb-2">
          Select Photo:
        </label>
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </div>

      {previewSrc && (
        <div className="mb-4">
          <img src={previewSrc} alt="Preview" className="w-64 h-64 object-cover rounded" />
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

      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-200 mb-2">
          Latitude:
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
          Longitude:
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
    </div>
  );
};

export default PhotoUpload;
