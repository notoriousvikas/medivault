import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import cloudinary from '../config/cloudinary.js';

/**
 * Upload a Multer file (memory storage) to Cloudinary as a raw document.
 * Falls back seamlessly to persistent local static storage if Cloudinary
 * encounters a network timeout or error, ensuring 100% demo resilience.
 */
async function uploadDocument(file, { folder = 'ayuraksha/documents' } = {}) {
  if (!file?.buffer) {
    throw new TypeError('A Multer file with a buffer is required.');
  }

  const extension = path.extname(file.originalname || '').toLowerCase() || '.png';
  const publicId = `${randomUUID()}${extension}`;

  // 1. Attempt Cloudinary upload with a 5s race timeout
  const cloudinaryPromise = new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          url: result.secure_url || result.url,
          publicId: result.public_id,
          originalName: file.originalname,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    upload.end(file.buffer);
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Cloudinary timeout (5s)')), 5000)
  );

  try {
    const result = await Promise.race([cloudinaryPromise, timeoutPromise]);
    return result;
  } catch (err) {
    console.warn(`[Upload Resilience] Cloudinary failed or timed out (${err.message}). Saving to local vault storage.`);

    // 2. Fallback: Save file to local uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localFilePath = path.join(uploadsDir, publicId);
    fs.writeFileSync(localFilePath, file.buffer);

    const baseUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const localUrl = `${baseUrl}/uploads/${publicId}`;

    return {
      url: localUrl,
      publicId,
      originalName: file.originalname,
      format: extension.replace('.', ''),
      bytes: file.buffer.length,
      storage: 'local_fallback',
    };
  }
}

export default uploadDocument;
