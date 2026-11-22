import express from 'express';
import * as controller from './chat.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';
import audioUpload from '../../middleware/audioUpload.middleware.js';

const router = express.Router();

router.use(verifyAuth);

// Supported Indian languages for voice interaction
router.get('/languages', controller.getSupportedLanguages);

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
