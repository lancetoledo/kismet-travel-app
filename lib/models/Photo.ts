// File: /lib/models/Photo.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IPhoto extends Document {
  userId: mongoose.Types.ObjectId;
  photoUrl: string;
  thumbnailUrl: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  description: string;
  createdAt: Date;
}

const PhotoSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  photoUrl: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true },
  },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Create a geospatial index on the location field for efficient queries
PhotoSchema.index({ location: '2dsphere' });

export default mongoose.models.Photo || mongoose.model<IPhoto>('Photo', PhotoSchema);
