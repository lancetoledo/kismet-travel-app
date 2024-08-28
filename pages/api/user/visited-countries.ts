// File: pages/api/user/visited-countries.ts

import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { MongoClient } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req })

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const client = await MongoClient.connect(process.env.MONGODB_URI as string)
  const db = client.db()

  if (req.method === 'GET') {
    try {
      const user = await db.collection('users').findOne({ email: session.user.email })
      res.status(200).json({ visitedCountries: user?.visitedCountries || [] })
    } catch (error) {
      console.error('Error fetching visited countries:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'POST') {
    try {
      const { visitedCountries } = req.body
      await db.collection('users').updateOne(
        { email: session.user.email },
        { $set: { visitedCountries } }
      )
      res.status(200).json({ message: 'Updated successfully' })
    } catch (error) {
      console.error('Error updating visited countries:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }

  await client.close()
}