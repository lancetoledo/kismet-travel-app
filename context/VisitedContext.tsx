import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import debounce from 'lodash.debounce';
import { toast } from 'react-toastify';
import usCountiesGeoJSON from '../data/usCountiesFeatureCollection.json';

interface VisitedContextProps {
  visitedStates: string[];
  setVisitedStates: React.Dispatch<React.SetStateAction<string[]>>;
  visitedCounties: { [stateId: string]: string[] };
  setVisitedCounties: React.Dispatch<React.SetStateAction<{ [stateId: string]: string[] }>>;
  usExplored: number;
  setUsExplored: React.Dispatch<React.SetStateAction<number>>;
  toggleVisitedState: (stateId: string) => void;
  updateVisitedLocations: (
    updatedStates: string[],
    updatedCounties: { [key: string]: string[] },
    calculatedUsExplored: number
  ) => void;
}

export const VisitedContext = createContext<VisitedContextProps>({
  visitedStates: [],
  setVisitedStates: () => {},
  visitedCounties: {},
  setVisitedCounties: () => {},
  usExplored: 0,
  setUsExplored: () => {},
  toggleVisitedState: () => {},
  updateVisitedLocations: () => {},
});

export const VisitedProvider: React.FC = ({ children }) => {
  const [visitedStates, setVisitedStates] = useState<string[]>([]);
  const [visitedCounties, setVisitedCounties] = useState<{ [stateId: string]: string[] }>({});
  const [usExplored, setUsExplored] = useState<number>(0);

  // Fetch visited locations on mount
  useEffect(() => {
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
        toast.error('Failed to load your visited locations.');
      }
    };

    fetchVisitedLocations();
  }, []);

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

  // Handler to toggle visited state
  const toggleVisitedState = (stateId: string) => {
    // Implement the logic here, similar to your existing code
    // Update visitedStates and visitedCounties accordingly
  };

  return (
    <VisitedContext.Provider
      value={{
        visitedStates,
        setVisitedStates,
        visitedCounties,
        setVisitedCounties,
        usExplored,
        setUsExplored,
        toggleVisitedState,
        updateVisitedLocations,
      }}
    >
      {children}
    </VisitedContext.Provider>
  );
};
