'use client'

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '../../hooks/useAuth';
import Header from '../../components/Header';

interface UserProfile {
  name: string;
  email: string;
  image: string;
  visitedCountries: string[];
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { session } = useAuth(true);
  const { data: sessionData } = useSession();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (sessionData?.user?.email) {
        try {
          const response = await fetch(`/api/user/profile?email=${sessionData.user.email}`);
          if (response.ok) {
            const data = await response.json();
            setUserProfile(data);
          } else {
            console.error('Failed to fetch user profile');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };

    fetchUserProfile();
  }, [sessionData]);

  if (!userProfile) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-green-500 p-4">
            <div className="flex items-center space-x-4">
              <img
                src={userProfile.image || '/placeholder-avatar.png'}
                alt={userProfile.name}
                className="h-24 w-24 rounded-full border-4 border-white"
              />
              <div>
                <h1 className="text-3xl font-bold text-white">{userProfile.name}</h1>
                <p className="text-green-100">{userProfile.email}</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Travel Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-lg text-gray-600">Countries Visited</p>
                <p className="text-3xl font-bold text-green-500">{userProfile.visitedCountries.length}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-lg text-gray-600">World Explored</p>
                <p className="text-3xl font-bold text-green-500">
                  {((userProfile.visitedCountries.length / 195) * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Travels</h3>
            {/* TODO: Add a list or grid of recent travels */}
            <p className="text-gray-600">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}