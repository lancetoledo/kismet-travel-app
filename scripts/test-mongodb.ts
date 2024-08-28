import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testConnection() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in .env.local')
  }

  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    console.log('Successfully connected to MongoDB')
    const db = client.db()
    const collections = await db.listCollections().toArray()
    console.log('Collections:', collections.map(c => c.name))
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
  } finally {
    await client.close()
  }
}

testConnection()