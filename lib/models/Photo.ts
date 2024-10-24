// File: /lib/models/Photo.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPhoto extends Document {
  userId: mongoose.Types.ObjectId;
  photoUrl: string;
  thumbnailUrl: string;
  location: {
    type: string;
    coordinates: [number, number];
    name?: string; // Optional location name
  };
  description: string;
  createdAt: Date;
}

const PhotoSchema: Schema<IPhoto> = new Schema<IPhoto>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  photoUrl: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
    name: { type: String }, // Optional
  },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Create a geospatial index on the location field for efficient queries
PhotoSchema.index({ location: '2dsphere' });

// Prevent model overwrite upon initial compile
const Photo: Model<IPhoto> = mongoose.models.Photo || mongoose.model<IPhoto>('Photo', PhotoSchema);

export default Photo;
