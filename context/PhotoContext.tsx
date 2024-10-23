import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

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

interface PhotoContextProps {
  userPhotos: Photo[];
  setUserPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  fetchUserPhotos: () => void;
}

export const PhotoContext = createContext<PhotoContextProps>({
  userPhotos: [],
  setUserPhotos: () => {},
  fetchUserPhotos: () => {},
});

export const PhotoProvider: React.FC = ({ children }) => {
  const [userPhotos, setUserPhotos] = useState<Photo[]>([]);

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

  // Fetch user photos on mount
  useEffect(() => {
    fetchUserPhotos();
  }, []);

  return (
    <PhotoContext.Provider value={{ userPhotos, setUserPhotos, fetchUserPhotos }}>
      {children}
    </PhotoContext.Provider>
  );
};
