import { randomUUID } from 'node:crypto';
import path from 'node:path';
import cloudinary from '../config/cloudinary.js';

/** Upload a Multer file (memory storage) to Cloudinary as a raw document. */
function uploadDocument(file, { folder = 'medivault/documents' } = {}) {
  if (!file?.buffer) {
    return Promise.reject(new TypeError('A Multer file with a buffer is required.'));
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  const publicId = `${randomUUID()}${extension}`;

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'raw',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          originalName: file.originalname,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    upload.end(file.buffer);
  });
}

export default uploadDocument;
