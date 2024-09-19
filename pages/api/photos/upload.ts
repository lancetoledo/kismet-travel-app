// File: /pages/api/photos/upload.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import formidable, { File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '../../../lib/mongodb';
import Photo from '../../../lib/models/Photo';

// Disable default body parsing to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

interface ExtendedNextApiRequest extends NextApiRequest {
  files: {
    photo: File;
  };
}

export default async function uploadPhoto(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const form = new formidable.IncomingForm();
  form.uploadDir = path.join(process.cwd(), '/public/uploads');
  form.keepExtensions = true;

  // Ensure the upload directory exists
  if (!fs.existsSync(form.uploadDir)) {
    fs.mkdirSync(form.uploadDir, { recursive: true });
  }

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Formidable error:', err);
      return res.status(500).json({ success: false, error: 'Form parsing error' });
    }

    const file = files.photo;
    const description = fields.description as string;
    const latitude = parseFloat(fields.latitude as string);
    const longitude = parseFloat(fields.longitude as string);

    if (!file) {
      return res.status(400).json({ success: false, error: 'No photo uploaded' });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ success: false, error: 'Invalid latitude or longitude' });
    }

    try {
      // Generate a unique filename
      const fileName = `${Date.now()}-${file.originalFilename}`;
      const newPath = path.join(form.uploadDir, fileName);

      // Move the file from temp to the uploads directory
      fs.renameSync(file.filepath, newPath);

      const photoUrl = `/uploads/${fileName}`;
      const thumbnailUrl = photoUrl; // For simplicity; ideally, generate actual thumbnails

      // Connect to MongoDB
      await connectToDatabase();

      // Create a new Photo document
      const newPhoto = new Photo({
        userId: session.user.id, // Ensure `session.user.id` exists; adjust based on your auth setup
        photoUrl,
        thumbnailUrl,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        description,
      });

      await newPhoto.save();

      return res.status(201).json({ success: true, data: newPhoto });
    } catch (error) {
      console.error('Error saving photo:', error);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  });
}
