// /pages/api/user/visited-countries.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import connectToDatabase from '../../../lib/mongodb';
import User from '../../../lib/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await connectToDatabase();

  const userEmail = session.user.email;

  if (req.method === 'GET') {
    try {
      const user = await User.findOne({ email: userEmail });
      res.status(200).json({ visitedCountries: user?.visitedCountries || [] });
    } catch (error) {
      console.error('Error fetching visited countries:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { visitedCountries } = req.body;
      await User.updateOne(
        { email: userEmail },
        { $set: { visitedCountries } }
      );
      res.status(200).json({ message: 'Updated successfully' });
    } catch (error) {
      console.error('Error updating visited countries:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
