// /pages/api/photos/upload.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import formidable, { Fields, Files, File } from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import connectToDatabase from '../../../lib/mongoose';
import Photo from '../../../lib/models/Photo';
import sharp from 'sharp';

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadPhoto = async (req: NextApiRequest, res: NextApiResponse) => {
  let newFileName: string | undefined;
  let thumbnailFileName: string | undefined;

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }

    const session = await getSession({ req });

    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const uploadDir = path.join(process.cwd(), '/public/uploads');

    // Ensure the upload directory exists
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      keepExtensions: true,
      uploadDir: uploadDir,
      multiples: false,
    });

    const parseForm = () =>
      new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
        form.parse(req, (err, fields: Fields, files: Files) => {
          if (err) {
            reject(err);
          } else {
            resolve({ fields, files });
          }
        });
      });

    const { fields, files } = await parseForm();

    // Enhanced logging for debugging
    console.log('Parsed Fields:', fields);
    console.log('Parsed Files:', files);

    // Safely extract and validate fields
    const extractField = (field: any): string | undefined => {
      if (Array.isArray(field)) {
        return field[0]?.toString();
      }
      return typeof field === 'string' ? field : undefined;
    };

    const description = extractField(fields.description)?.trim();
    const latitudeStr = extractField(fields.latitude);
    const longitudeStr = extractField(fields.longitude);
    const locationName = extractField(fields.locationName)?.trim();

    const latitude = latitudeStr ? parseFloat(latitudeStr) : NaN;
    const longitude = longitudeStr ? parseFloat(longitudeStr) : NaN;

    if (!files.photo) {
      return res.status(400).json({ success: false, error: 'No photo uploaded.' });
    }

    // Access the uploaded file
    let file = files.photo as File | File[];

    // If it's an array, take the first element
    if (Array.isArray(file)) {
      file = file[0];
    }

    // Logging the file object
    console.log('File object:', file);

    const filePath = file.filepath;
    const mimeType = file.mimetype;

    console.log('File Path:', filePath);
    console.log('MIME Type:', mimeType);

    if (!description) {
      return res.status(400).json({ success: false, error: 'Description is required.' });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ success: false, error: 'Invalid latitude or longitude.' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!mimeType || !allowedTypes.includes(mimeType)) {
      if (filePath) {
        await fs.unlink(filePath).catch((unlinkErr) => {
          console.error('Error deleting invalid file:', unlinkErr);
        });
      }
      return res.status(400).json({ success: false, error: 'Unsupported file type. Please upload an image.' });
    }

    // Generate unique filenames
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const originalFilename = file.originalFilename || 'upload';
    const fileExtension = path.extname(originalFilename);
    newFileName = `${uniqueSuffix}${fileExtension}`;
    const newPath = path.join(uploadDir, newFileName);

    // Move the file
    await fs.rename(filePath, newPath);

    // Generate thumbnail
    thumbnailFileName = `${uniqueSuffix}-thumbnail${fileExtension}`;
    const thumbnailPath = path.join(uploadDir, thumbnailFileName);

    await sharp(newPath)
      .resize(200, 200, { fit: 'inside' })
      .toFile(thumbnailPath);

    const photoUrl = `/uploads/${newFileName}`;
    const thumbnailUrl = `/uploads/${thumbnailFileName}`;

    await connectToDatabase();

    const newPhoto = new Photo({
      userId: session.user.id,
      photoUrl,
      thumbnailUrl,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
        name: locationName || undefined,
      },
      description,
    });

    await newPhoto.save();

    return res.status(201).json({ success: true, data: newPhoto });
  } catch (error: any) {
    console.error('Error in uploadPhoto:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File size exceeds the limit of 5MB.' });
    }

    // Delete files if they were created
    if (newFileName) {
      await fs.unlink(path.join(uploadDir, newFileName)).catch((unlinkErr) => {
        console.error('Error deleting file after server error:', unlinkErr);
      });
    }

    if (thumbnailFileName) {
      await fs.unlink(path.join(uploadDir, thumbnailFileName)).catch((unlinkErr) => {
        console.error('Error deleting thumbnail after server error:', unlinkErr);
      });
    }

    return res.status(500).json({ success: false, error: 'Server error while uploading the photo.' });
  }
};

export default uploadPhoto;
