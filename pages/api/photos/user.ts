// File: /pages/api/photos/user.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../lib/mongodb';
import Photo from '../../../lib/models/Photo';

export default async function getUserPhotos(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    await connectToDatabase();

    const photos = await Photo.find({ userId: session.user.id }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
