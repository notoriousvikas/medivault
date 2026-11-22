import multer from 'multer';

const allowedAudioMimeTypes = new Set([
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/opus',
  'audio/m4a',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
  // Browsers recording audio via MediaRecorder often label audio blobs as video/webm or video/mp4
  'video/webm',
  'video/mp4',
]);

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // 15 MB limit (sufficient for up to a few minutes of voice input, well within Sarvam 30s limit)
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    // Check MIME type or common audio extension
    const isMimeAllowed = allowedAudioMimeTypes.has(file.mimetype);
    const isExtensionAllowed = /\.(wav|mp3|m4a|aac|ogg|webm|opus|flac)$/i.test(file.originalname || '');

    if (!isMimeAllowed && !isExtensionAllowed) {
      callback(new Error('Unsupported audio format. Please upload WAV, MP3, WebM, OGG, or M4A audio.'));
      return;
    }

    callback(null, true);
  },
});

export default audioUpload;
