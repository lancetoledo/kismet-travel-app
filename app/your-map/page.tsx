'use client'

import React, { useState, useEffect } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { scaleLinear } from 'd3-scale'
import { useSession } from 'next-auth/react'
import { useAuth } from '../../hooks/useAuth'
import { simplifiedWorldMap, WorldMapData } from '../../data/simplifiedWorldMap'

const colorScale = scaleLinear<string>()
  .domain([0, 1])
  .range(["#ffedea", "#ff5233"]);

export default function YourMapPage() {
  const [visitedCountries, setVisitedCountries] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { session } = useAuth(true)
  const { data: sessionData } = useSession()

  useEffect(() => {
    const fetchVisitedCountries = async () => {
      if (!session) {
        console.log("No session, skipping fetch");
        setIsLoading(false);
        return;
      }
      setIsLoading(true)
      setError(null)
      try {
        console.log("Fetching visited countries...");
        const response = await fetch('/api/user/visited-countries')
        if (response.ok) {
          const data = await response.json()
          console.log("Fetched visited countries:", data.visitedCountries);
          setVisitedCountries(data.visitedCountries || [])
        } else {
          console.error('Failed to fetch visited countries')
          setError('Failed to fetch visited countries')
        }
      } catch (error) {
        console.error('Error fetching visited countries:', error)
        setError('Error fetching visited countries')
      } finally {
        setIsLoading(false)
      }
    }

    fetchVisitedCountries()
  }, [session])

  const handleCountryClick = async (countryId: string) => {
    console.log("Country clicked:", countryId);
    let updatedCountries: string[]
    if (visitedCountries.includes(countryId)) {
      updatedCountries = visitedCountries.filter(id => id !== countryId)
    } else {
      updatedCountries = [...visitedCountries, countryId]
    }
    console.log("Updated visited countries:", updatedCountries);
    setVisitedCountries(updatedCountries)

    try {
      console.log("Updating visited countries on server...");
      const response = await fetch('/api/user/visited-countries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visitedCountries: updatedCountries }),
      })
      if (!response.ok) {
        console.error('Failed to update visited countries')
        setError('Failed to update visited countries')
      } else {
        console.log("Successfully updated visited countries on server");
      }
    } catch (error) {
      console.error('Error updating visited countries:', error)
      setError('Error updating visited countries')
    }
  }

  const calculateExploredPercentage = () => {
    if (simplifiedWorldMap.features.length === 0) {
      console.log("No countries in the world map data");
      return "0.00";
    }
    const percentage = ((visitedCountries.length / simplifiedWorldMap.features.length) * 100).toFixed(2)
    console.log("Calculated explored percentage:", percentage);
    return percentage;
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">Error: {error}</div>
  }

  console.log("Rendering map with visited countries:", visitedCountries);

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-4xl font-bold text-green-500 mb-8">Your World Map</h1>
      <div className="bg-gray-100 rounded-lg p-4 mb-8">
        <ComposableMap>
          <Geographies geography={simplifiedWorldMap as WorldMapData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const isVisited = visitedCountries.includes(geo.properties.id);
                return (
                  <Geography
                    key={geo.properties.id}
                    geography={geo}
                    fill={isVisited ? colorScale(1) : colorScale(0)}
                    stroke="#FFFFFF"
                    strokeWidth={0.5}
                    onClick={() => handleCountryClick(geo.properties.id)}
                    style={{
                      default: {
                        outline: 'none',
                      },
                      hover: {
                        fill: '#F53',
                        outline: 'none',
                        cursor: 'pointer'
                      },
                      pressed: {
                        fill: '#E42',
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
      <div className="bg-gray-100 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          {sessionData?.user?.name}'s Travel Stats
        </h2>
        <p className="text-lg text-gray-600 mb-2">
          Places visited: <span className="font-bold text-green-500">{visitedCountries.length}</span>
        </p>
        <p className="text-lg text-gray-600">
          World explored: <span className="font-bold text-green-500">{calculateExploredPercentage()}%</span>
        </p>
      </div>
    </div>
  )
}