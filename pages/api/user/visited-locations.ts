import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongodb';
import Joi from 'joi';

// Total number of U.S. states
const TOTAL_STATES = 50; // Adjust if considering territories

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Retrieve the session using getServerSession
  const session = await getServerSession(req, res, authOptions);

  console.log('Session in API Route:', session);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = await clientPromise;
  const db = client.db();
  const userEmail = session.user?.email;

  if (!userEmail) {
    return res.status(400).json({ error: 'User email not found in session' });
  }

  if (req.method === 'GET') {
    // Fetch the user's visited locations from the database
    const user = await db.collection('users').findOne({ email: userEmail });
    res.status(200).json({
      visitedStates: user?.visitedStates || [],
      visitedCounties: user?.visitedCounties || {},
      usExplored: user?.usExplored || 0,
    });
  } else if (req.method === 'POST') {
    // Define Joi schema for validation
    const schema = Joi.object({
      visitedStates: Joi.array().items(Joi.string().length(2)).required(),
      visitedCounties: Joi.object().pattern(
        Joi.string().length(2),
        Joi.array().items(Joi.string().length(5))
      ).required(),
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

    // Update the user's visited locations and "U.S. Explored" in the database
    await db.collection('users').updateOne(
      { email: userEmail },
      {
        $set: {
          visitedStates: visitedStates,
          visitedCounties: visitedCounties,
          usExplored: usExplored,
        },
      },
      { upsert: true } // Create the document if it doesn't exist
    );

    res.status(200).json({ message: 'Visited locations updated successfully', usExplored });
  } else {
    // Method not allowed
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
