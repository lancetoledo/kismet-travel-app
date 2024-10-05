// /lib/mongodb.ts

import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
const options = {}

let client
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri, options)
    ;(global as any)._mongoClientPromise = client.connect()
      .catch(err => {
        console.error('Failed to connect to MongoDB', err)
        throw err
      })
  }
  clientPromise = (global as any)._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
    .catch(err => {
      console.error('Failed to connect to MongoDB', err)
      throw err
    })
}

export default clientPromise
