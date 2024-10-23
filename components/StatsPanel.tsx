import React, { useContext } from 'react';
import { MapContext } from '../context/MapContext';
import { VisitedContext } from '../context/VisitedContext';

import usStatesGeoJSON from '../data/usStatesFeatureCollection.json';
import usCountiesGeoJSON from '../data/usCountiesFeatureCollection.json';

interface StatsPanelProps {
  userName: string | null;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ userName }) => {
  const { selectedState, setSelectedState } = useContext(MapContext);
  const { visitedStates, visitedCounties, usExplored } = useContext(VisitedContext);

  // Map state FIPS codes to state names
  const stateFIPSToName: { [key: string]: string } = {};
  usStatesGeoJSON.features.forEach((feature) => {
    const stateId = feature.properties?.STATEFP;
    const stateName = feature.properties?.NAME;
    if (stateId && stateName) {
      stateFIPSToName[stateId] = stateName;
    }
  });

  // Calculate state explored percentage
  const calculateStateExploredPercentage = (stateId: string): string => {
    const stateCounties = usCountiesGeoJSON.features.filter(
      (county) => county.properties?.STATEFP === stateId
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
    setSelectedState(null);
  };

  return (
    <div className="w-full lg:w-80 bg-white shadow rounded-lg p-6 dark:bg-gray-800">
      <h2 className="text-2xl font-semibold text-green-700 mb-4 text-center dark:text-green-300">
        {selectedState
          ? `${stateFIPSToName[selectedState]} Travel Stats`
          : userName
          ? `${userName}'s Travel Stats`
          : 'Your Travel Stats'}
      </h2>
      {selectedState === null ? (
        <div className="space-y-4">
          <p className="text-lg text-gray-700 dark:text-gray-200">
            States Visited:{' '}
            <span className="font-bold text-green-700 dark:text-green-300">
              {visitedStates.length}
            </span>
          </p>
          <p className="text-lg text-gray-700 dark:text-gray-200">
            U.S. Explored:{' '}
            <span className="font-bold text-green-700 dark:text-green-300">
              {usExplored}%
            </span>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-lg text-gray-700 dark:text-gray-200">
            Counties Visited in {stateFIPSToName[selectedState]}:{' '}
            <span className="font-bold text-green-700 dark:text-green-300">
              {(visitedCounties[selectedState] || []).length}
            </span>
            {' / '}
            <span className="font-bold text-green-700 dark:text-green-300">
              {
                usCountiesGeoJSON.features.filter(
                  (county) => county.properties?.STATEFP === selectedState
                ).length
              }
            </span>
          </p>
          <p className="text-lg text-gray-700 dark:text-gray-200">
            {stateFIPSToName[selectedState]} Explored:{' '}
            <span className="font-bold text-green-700 dark:text-green-300">
              {calculateStateExploredPercentage(selectedState)}%
            </span>
          </p>
          <button
            onClick={resetZoom}
            className="mt-4 w-full bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 transition-colors duration-200 dark:bg-green-600 dark:hover:bg-green-500"
          >
            Back to U.S. Map
          </button>
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
