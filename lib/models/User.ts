// /lib/models/User.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  image?: string;
  visitedCountries?: string[];
  visitedStates?: string[];
  visitedCounties?: {
    [stateCode: string]: string[];
  };
  usExplored?: number;
}

const UserSchema: Schema = new Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  image: { type: String },
  visitedCountries: { type: [String], default: [] },
  visitedStates: { type: [String], default: [] },
  visitedCounties: { type: Schema.Types.Mixed, default: {} },
  usExplored: { type: Number, default: 0 },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
