// File: /pages/api/user/visited-locations.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import clientPromise from '../../../lib/mongodb';
import Joi from 'joi'; // Import Joi for validation

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get the user session
  const session = await getSession({ req });

  // Debugging: Log the session
  console.log('Session in API Route:', session);

  // If the user is not authenticated, return an error
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Connect to the database
  const client = await clientPromise;
  const db = client.db();

  // Get the user's email from the session
  const userEmail = session.user?.email;

  if (!userEmail) {
    return res.status(400).json({ error: 'User email not found in session' });
  }

  if (req.method === 'GET') {
    // Fetch the user's visited locations from the database
    const user = await db.collection('users').findOne({ email: userEmail });
    console.log('User Data:', user); // Debugging
    res.status(200).json({
      visitedStates: user?.visitedStates || [],
      visitedCounties: user?.visitedCounties || {},
    });
  } else if (req.method === 'POST') {
    // Define Joi schema for validation
    const schema = Joi.object({
      visitedStates: Joi.array().items(Joi.string().length(2)).required(),
      visitedCounties: Joi.object().pattern(
        Joi.string().length(2),
        Joi.array().items(Joi.string().length(5)) // Assuming county IDs are 5 characters
      ).required(),
    });

    // Validate the request body against the schema
    const { error, value } = schema.validate(req.body);

    if (error) {
      console.error('Validation Error:', error.details);
      return res.status(400).json({ error: 'Invalid data format', details: error.details });
    }

    const { visitedStates, visitedCounties } = value;

    // Update the user's visited locations in the database
    await db.collection('users').updateOne(
      { email: userEmail },
      {
        $set: {
          visitedStates: visitedStates,
          visitedCounties: visitedCounties,
        },
      },
      { upsert: true } // Create the document if it doesn't exist
    );

    console.log('Visited locations updated successfully for:', userEmail); // Debugging
    res.status(200).json({ message: 'Visited locations updated successfully' });
  } else {
    // Method not allowed
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
