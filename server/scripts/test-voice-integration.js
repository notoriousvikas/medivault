import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Testing MediVault Sarvam Voice AI Integration ---');

  // 1. Authenticate patient
  const loginRes = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ayuraksha.io', password: 'Password123!' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  console.log('✅ Authenticated successfully.');

  // 2. Test GET /api/chat/languages
  const langRes = await fetch(`${API_BASE}/chat/languages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const langData = await langRes.json();
  console.log(`✅ GET /api/chat/languages: ${langData.data.length} Indic languages supported.`);

  // 3. Test POST /api/chat (Existing text chat)
  const textChatRes = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message: 'Hello, what is AyuRaksha?' }),
  });
  const textChatData = await textChatRes.json();
  if (textChatData.status !== 'success') throw new Error(`Text chat failed: ${JSON.stringify(textChatData)}`);
  console.log('✅ Existing text Groq chat reply:', textChatData.data.reply.slice(0, 100) + '...');

  // 4. Test POST /api/chat/synthesize (TTS only)
  const ttsRes = await fetch(`${API_BASE}/chat/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: 'आपकी स्वास्थ्य रिपोर्ट सुरक्षित है।',
      languageCode: 'hi-IN',
    }),
  });
  const ttsData = await ttsRes.json();
  if (ttsData.status !== 'success' || !ttsData.data.audio) throw new Error(`TTS failed: ${JSON.stringify(ttsData)}`);
  console.log('✅ On-demand TTS success! Audio data URL length:', ttsData.data.audio.length);

  // 5. Test POST /api/chat/voice (Full Voice Pipeline: Audio -> STT -> Groq -> TTS -> Audio response)
  // First, generate realistic audio bytes using Sarvam TTS to act as user's voice input
  const testVoiceAudio = Buffer.from(ttsData.data.audio.replace(/^data:audio\/wav;base64,/, ''), 'base64');

  const formData = new FormData();
  const audioBlob = new Blob([testVoiceAudio], { type: 'audio/wav' });
  formData.append('audio', audioBlob, 'patient_query.wav');
  formData.append('languageCode', 'hi-IN');

  const voiceRes = await fetch(`${API_BASE}/chat/voice`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const voiceData = await voiceRes.json();
  if (voiceData.status !== 'success') throw new Error(`Voice conversation failed: ${JSON.stringify(voiceData)}`);

  console.log('✅ Full Voice AI Conversation Success!');
  console.log('   - Transcribed query (Saaras v4):', `"${voiceData.data.transcript}"`);
  console.log('   - AI Answer (Groq LLM):', `"${voiceData.data.reply.slice(0, 80)}..."`);
  console.log('   - Voice response generated (Bulbul v4 Flash):', Boolean(voiceData.data.audio), 'Length:', voiceData.data.audio?.length);
  console.log('   - Language code:', voiceData.data.languageCode);

  console.log('\n🎉 ALL 5 INTEGRATION TESTS PASSED PERFECTLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
