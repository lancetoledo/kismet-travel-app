// File: /pages/api/photos/user.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import connectToDatabase from '../../../lib/mongoose'; // Updated import
import Photo from '../../../lib/models/Photo';

const getUserPhotos = async (req: NextApiRequest, res: NextApiResponse) => {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  // Authenticate the user
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    // Connect to the database using Mongoose
    await connectToDatabase();

    // Fetch photos associated with the user, sorted by creation date descending
    const photos = await Photo.find({ userId: session.user.id }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

export default getUserPhotos;
