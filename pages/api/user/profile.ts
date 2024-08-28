import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { email } = req.query;

  if (typeof email !== 'string') {
    return res.status(400).json({ message: 'Invalid email parameter' });
  }

  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI as string);
    const db = client.db();

    const user = await db.collection('users').findOne({ email });

    if (!user) {
      client.close();
      return res.status(404).json({ message: 'User not found' });
    }

    const profile = {
      name: user.name,
      email: user.email,
      image: user.image,
      visitedCountries: user.visitedCountries || [],
    };

    client.close();
    res.status(200).json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}