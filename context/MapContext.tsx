import React, { createContext, useState } from 'react';

interface Viewport {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

interface MapContextProps {
  viewport: Viewport;
  setViewport: React.Dispatch<React.SetStateAction<Viewport>>;
  selectedState: string | null;
  setSelectedState: React.Dispatch<React.SetStateAction<string | null>>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const MapContext = createContext<MapContextProps>({
  viewport: {
    latitude: 38,
    longitude: -97,
    zoom: 4,
    bearing: 0,
    pitch: 0,
  },
  setViewport: () => {},
  selectedState: null,
  setSelectedState: () => {},
  isDarkMode: true,
  toggleDarkMode: () => {},
});

export const MapProvider: React.FC = ({ children }) => {
  const [viewport, setViewport] = useState<Viewport>({
    latitude: 38,
    longitude: -97,
    zoom: 4,
    bearing: 0,
    pitch: 0,
  });
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <MapContext.Provider
      value={{
        viewport,
        setViewport,
        selectedState,
        setSelectedState,
        isDarkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </MapContext.Provider>
  );
};
