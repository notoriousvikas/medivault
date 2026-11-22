import express from 'express';
import * as controller from './chat.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';
import audioUpload from '../../middleware/audioUpload.middleware.js';

const router = express.Router();

router.use(verifyAuth);

// Helper to handle optional audio upload for live voice turns
const optionalAudioUpload = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    return audioUpload.single('audio')(req, res, next);
  }
  next();
};

// Supported Indian languages for voice interaction
router.get('/languages', controller.getSupportedLanguages);

// Real-time Live Audio Chat turn (Accepts recognized text or recorded voice chunk -> Groq RAG -> Sarvam TTS)
router.post('/live-turn', optionalAudioUpload, controller.liveTurn);

// Multilingual Voice AI interaction (STT -> Groq RAG -> TTS)
router.post('/voice', audioUpload.single('audio'), controller.voiceConversation);

// Dictation / Speech-to-Text only
router.post('/transcribe', audioUpload.single('audio'), controller.transcribeAudioOnly);

// On-demand Text-to-Speech synthesis for existing messages
router.post('/synthesize', controller.synthesizeSpeechOnly);

// Standard text chat and conversation management
router
  .route('/')
  .get(controller.getChatHistory)
  .post(controller.sendMessage)
  .delete(controller.clearChatHistory);

router.delete('/:id', controller.deleteChatMessage);

export default router;
