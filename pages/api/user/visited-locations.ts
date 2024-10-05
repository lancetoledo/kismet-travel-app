// /pages/api/user/visited-locations.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import connectToDatabase from '../../../lib/mongoose';
import User from '../../../lib/models/User';
import Joi from 'joi';

// Total number of U.S. states
const TOTAL_STATES = 50; // Adjust if considering territories

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  console.log('Session in API Route:', session);

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await connectToDatabase();

  const userEmail = session.user.email;

  if (req.method === 'GET') {
    try {
      const user = await User.findOne({ email: userEmail });
      res.status(200).json({
        visitedStates: user?.visitedStates || [],
        visitedCounties: user?.visitedCounties || {},
        usExplored: user?.usExplored || 0,
      });
    } catch (error) {
      console.error('Error fetching visited locations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Define Joi schema for validation
    const schema = Joi.object({
      visitedStates: Joi.array().items(Joi.string().length(2)).required(),
      visitedCounties: Joi.object()
        .pattern(
          Joi.string().length(2),
          Joi.array().items(Joi.string().length(5))
        )
        .required(),
    });

    // Validate the request body against the schema
    const { error, value } = schema.validate(req.body);

    if (error) {
      console.error('Validation Error:', error.details);
      return res.status(400).json({ error: 'Invalid data format', details: error.details });
    }

    const { visitedStates, visitedCounties } = value;

    // Calculate "U.S. Explored" percentage
    const usExplored = parseFloat(((visitedStates.length / TOTAL_STATES) * 100).toFixed(2));

    try {
      // Update the user's visited locations and "U.S. Explored" in the database
      await User.updateOne(
        { email: userEmail },
        {
          $set: {
            visitedStates: visitedStates,
            visitedCounties: visitedCounties,
            usExplored: usExplored,
          },
        },
        { upsert: true }
      );

      res.status(200).json({ message: 'Visited locations updated successfully', usExplored });
    } catch (error) {
      console.error('Error updating visited locations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    // Method not allowed
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
