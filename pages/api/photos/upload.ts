// File: /pages/api/photos/upload.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import formidable, { File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '../../../lib/mongodb';
import Photo from '../../../lib/models/Photo';
import sharp from 'sharp'; // For thumbnail generation

// Disable default body parsing to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Interface to extend NextApiRequest with files
interface ExtendedNextApiRequest extends NextApiRequest {
  files: {
    photo: File;
  };
}

const uploadPhoto = async (req: NextApiRequest, res: NextApiResponse) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  // Authenticate the user
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Initialize formidable for parsing form data
  const form = new formidable.IncomingForm({
    maxFileSize: 5 * 1024 * 1024, // 5 MB limit
    keepExtensions: true,
    uploadDir: path.join(process.cwd(), '/public/uploads'),
  });

  // Ensure the upload directory exists
  if (!fs.existsSync(form.uploadDir)) {
    fs.mkdirSync(form.uploadDir, { recursive: true });
  }

  // Parse the incoming form data
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Formidable Error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'File size exceeds the limit of 5MB.' });
      }
      return res.status(500).json({ success: false, error: 'Form parsing error.' });
    }

    const file = files.photo;
    const description = (fields.description as string)?.trim();
    const latitude = parseFloat(fields.latitude as string);
    const longitude = parseFloat(fields.longitude as string);
    const locationName = (fields.locationName as string)?.trim();

    // Validate required fields
    if (!file) {
      return res.status(400).json({ success: false, error: 'No photo uploaded.' });
    }

    if (!description) {
      return res.status(400).json({ success: false, error: 'Description is required.' });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ success: false, error: 'Invalid latitude or longitude.' });
    }

    // Validate file type (accepting common image formats)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype || '')) {
      // Remove the uploaded file if invalid
      fs.unlink(file.filepath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting invalid file:', unlinkErr);
      });
      return res.status(400).json({ success: false, error: 'Unsupported file type. Please upload an image.' });
    }

    try {
      // Generate a unique filename to prevent conflicts
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const fileExtension = path.extname(file.originalFilename || '');
      const newFileName = `${uniqueSuffix}${fileExtension}`;
      const newPath = path.join(form.uploadDir, newFileName);

      // Move the file to the uploads directory
      fs.renameSync(file.filepath, newPath);

      // Generate a thumbnail (200x200 pixels) using sharp
      const thumbnailFileName = `${uniqueSuffix}-thumbnail${fileExtension}`;
      const thumbnailPath = path.join(form.uploadDir, thumbnailFileName);

      await sharp(newPath)
        .resize(200, 200, { fit: 'inside' })
        .toFile(thumbnailPath);

      const photoUrl = `/uploads/${newFileName}`;
      const thumbnailUrl = `/uploads/${thumbnailFileName}`;

      // Connect to the database
      await connectToDatabase();

      // Create a new Photo document
      const newPhoto = new Photo({
        userId: session.user.id, // Ensure `session.user.id` exists; adjust based on your auth setup
        photoUrl,
        thumbnailUrl,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
          name: locationName || undefined, // Optional
        },
        description,
      });

      await newPhoto.save();

      return res.status(201).json({ success: true, data: newPhoto });
    } catch (error) {
      console.error('Error saving photo:', error);

      // Attempt to delete the uploaded files in case of a server error
      fs.unlink(path.join(form.uploadDir, newFileName), (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file after server error:', unlinkErr);
      });

      fs.unlink(path.join(form.uploadDir, thumbnailFileName), (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting thumbnail after server error:', unlinkErr);
      });

      return res.status(500).json({ success: false, error: 'Server error while saving the photo.' });
    }
  });
};

export default uploadPhoto;
