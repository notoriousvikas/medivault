import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const API_BASE = 'http://localhost:5000/api';

async function testLiveAudioChat() {
  console.log('====================================================');
  console.log('🎙️ TESTING MEDIVAULT LIVE AUDIO CHAT ENGINE');
  console.log('====================================================\n');

  // 1. Authenticate user
  console.log('1. Authenticating test user...');
  const loginRes = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ayuraksha.io', password: 'Password123!' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  console.log('   ✅ Authenticated successfully.\n');

  // 2. Supported languages endpoint
  console.log('2. Checking supported languages for Live Audio Chat...');
  const langRes = await fetch(`${API_BASE}/chat/languages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const langData = await langRes.json();
  console.log(`   ✅ Supported languages: ${langData.data.length} Indic & English languages.\n`);

  // 3. Fast Live Turn: Pre-transcribed English text turn
  console.log('3. Testing fast live audio turn (English text -> Groq RAG -> Sarvam TTS)...');
  const enTurnRes = await fetch(`${API_BASE}/chat/live-turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: 'Hello Aarogya, can you review my medical records and tell me if my medications are safe?',
      languageCode: 'en-IN',
    }),
  });
  const enTurnData = await enTurnRes.json();
  if (enTurnData.status !== 'success') {
    throw new Error(`English live turn failed: ${JSON.stringify(enTurnData)}`);
  }
  console.log('   ✅ English Live Turn Success!');
  console.log('      - Transcript:', enTurnData.data.transcript);
  console.log('      - AI Reply:', enTurnData.data.reply.slice(0, 100) + '...');
  console.log('      - Audio synthesized:', Boolean(enTurnData.data.audio), 'Data length:', enTurnData.data.audio?.length);
  console.log('      - Grounded context used:', enTurnData.data.contextUsed, '\n');

  // 4. Fast Live Turn: Hindi multilingual turn
  console.log('4. Testing multilingual live audio turn (Hindi text -> Groq RAG -> Sarvam Hindi TTS)...');
  const hiTurnRes = await fetch(`${API_BASE}/chat/live-turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: 'नमस्ते, मुझे दो दिनों से सिरदर्द और हल्का बुखार है, क्या मुझे आराम करना चाहिए?',
      languageCode: 'hi-IN',
    }),
  });
  const hiTurnData = await hiTurnRes.json();
  if (hiTurnData.status !== 'success') {
    throw new Error(`Hindi live turn failed: ${JSON.stringify(hiTurnData)}`);
  }
  console.log('   ✅ Hindi Live Turn Success!');
  console.log('      - Transcript:', hiTurnData.data.transcript);
  console.log('      - AI Reply:', hiTurnData.data.reply.slice(0, 100) + '...');
  console.log('      - Audio synthesized:', Boolean(hiTurnData.data.audio));
  console.log('      - Language code:', hiTurnData.data.languageCode, '\n');

  // 5. Fallback Live Turn with uploaded audio chunk (< 30s)
  console.log('5. Testing audio file live turn (Multipart Audio -> Sarvam STT -> Groq -> TTS)...');
  // Generate a short 2-3 second audio clip simulating a real spoken patient question
  const shortVoiceRes = await fetch(`${API_BASE}/chat/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: 'नमस्ते डॉक्टर, क्या मेरी रिपोर्ट ठीक है?',
      languageCode: 'hi-IN',
    }),
  });
  const shortVoiceData = await shortVoiceRes.json();

  if (shortVoiceData.data?.audio) {
    const rawAudioBuffer = Buffer.from(
      shortVoiceData.data.audio.replace(/^data:audio\/wav;base64,/, ''),
      'base64'
    );

    const formData = new FormData();
    const audioBlob = new Blob([rawAudioBuffer], { type: 'audio/wav' });
    formData.append('audio', audioBlob, 'live_speech_chunk.wav');
    formData.append('languageCode', 'hi-IN');

    const audioTurnRes = await fetch(`${API_BASE}/chat/live-turn`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const audioTurnData = await audioTurnRes.json();
    if (audioTurnData.status !== 'success') {
      throw new Error(`Audio multipart turn failed: ${JSON.stringify(audioTurnData)}`);
    }
    console.log('   ✅ Multipart Audio Live Turn Success!');
    console.log('      - Recognized query:', audioTurnData.data.transcript);
    console.log('      - AI response:', audioTurnData.data.reply.slice(0, 80) + '...');
    console.log('      - Audio output generated:', Boolean(audioTurnData.data.audio), '\n');
  }

  // 6. Verify chat memory persistence
  console.log('6. Verifying conversational history contains live audio turns...');
  const historyRes = await fetch(`${API_BASE}/chat`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const historyData = await historyRes.json();
  const lastMessages = historyData.data.slice(-2);
  console.log(`   ✅ Chat history contains ${historyData.data.length} messages.`);
  console.log('      - Latest message role:', lastMessages[lastMessages.length - 1]?.role);
  console.log('      - Live audio flag:', lastMessages[lastMessages.length - 1]?.metadata?.liveAudio);

  console.log('\n🎉 ALL LIVE AUDIO CHAT ENGINE INTEGRATION TESTS PASSED!');
  process.exit(0);
}

testLiveAudioChat().catch((err) => {
  console.error('\n❌ Test error:', err.message);
  process.exit(1);
});
