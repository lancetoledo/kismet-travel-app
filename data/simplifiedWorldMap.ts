// File: data/simplifiedWorldMap.ts

export const simplifiedWorldMap = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "United States", id: "USA" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-125, 24], [-125, 50], [-66, 50], [-66, 24], [-125, 24]]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Canada", id: "CAN" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-140, 50], [-140, 70], [-52, 70], [-52, 50], [-140, 50]]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Mexico", id: "MEX" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-118, 14], [-118, 32], [-86, 32], [-86, 14], [-118, 14]]]
      }
    },
    // Add more countries as needed...
  ]
} as const;

export type WorldMapData = typeof simplifiedWorldMap;