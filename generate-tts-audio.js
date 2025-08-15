#!/usr/bin/env node

import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

dotenv.config();

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App affirmations - HQ versions (matching productionPlaylist.ts)
const HQ_AFFIRMATIONS = [
  "I allow myself to be who I am meant to be",
  "I am worthy of all the abundance the universe has to offer", 
  "Success flows to me effortlessly and naturally",
  "I attract positive opportunities into my life",
  "I am confident in my ability to achieve my dreams",
  "Money comes to me easily and frequently",
  "I am grateful for all the blessings in my life",
  "I radiate positive energy and attract positive people",
  "My mind is focused on success and prosperity",
  "Every day, I am becoming more successful",
  "I trust in the perfect timing of my life",
  "I am deserving of love, happiness, and fulfillment",
  "My potential is unlimited and I embrace it fully",
  "I release all fears and step into my power",
  "I create my reality with intention and purpose"
];

// Preview affirmations - shorter versions for voice selection
const PREVIEW_AFFIRMATIONS = [
  "I embrace my unique journey with confidence",
  "I radiate peace and inner strength",
  "I choose love and compassion in every moment",
  "I am grounded and centered in my truth",
  "I welcome abundance into my life",
  "I trust my intuition and inner wisdom",
  "I am grateful for this moment of peace",
  "I shine my light brightly in the world",
  "I am focused on my highest good",
  "I celebrate my growth and progress",
  "I honor my journey and trust the process",
  "I am worthy of all good things",
  "I believe in my infinite potential",
  "I release fear and embrace courage",
  "I create with intention and love"
];

// ElevenLabs configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
console.log(ELEVENLABS_API_KEY);

// Voice configurations matching app structure
const VOICE_CONFIGS = {
  serenity: {
    id: 'EXAVITQu4vr4xnSDxMaL', // Bella - calm, clear female voice
    settings: {
      stability: 0.8,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true
    }
  },
  titan: {
    id: 'pNInz6obpgDQGcFmaJgB', // Adam - warm, confident male voice
    settings: {
      stability: 0.75,
      similarity_boost: 0.85,
      style: 0.15,
      use_speaker_boost: true
    }
  }
};

// Helper function to make ElevenLabs API request
function makeElevenLabsRequest(text, voiceId, voiceSettings) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      text: text,
      model_id: "eleven_monolingual_v1",
      voice_settings: voiceSettings
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const audioBuffer = Buffer.concat(chunks);
        resolve(audioBuffer);
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Helper function to clean existing files
async function cleanExistingFiles(outputDir) {
  try {
    const voiceTypes = ['serenity', 'titan'];
    for (const voiceType of voiceTypes) {
      const voiceDir = path.join(outputDir, voiceType);
      try {
        const files = await fs.readdir(voiceDir);
        for (const file of files) {
          if (file.endsWith('.mp3')) {
            await fs.unlink(path.join(voiceDir, file));
            console.log(`🗑️  Deleted: ${voiceType}/${file}`);
          }
        }
      } catch (_err) {
        // Directory might not exist, that's okay
        console.log(`📁 Voice directory ${voiceType} doesn't exist yet`);
      }
    }
  } catch (_err) {
    console.log(`📁 Starting fresh - no existing files to clean`);
  }
}

// Function to verify API key works
async function verifyApiKey() {
  if (!ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
    console.log('💡 Make sure you have a .env file with: ELEVENLABS_API_KEY=your_key_here');
    return false;
  }
  
  console.log('🔑 API key found, testing connection...');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: '/v1/voices',
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ API key is valid and working!');
        resolve(true);
      } else {
        console.error(`❌ API key test failed: HTTP ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', () => {
      console.error('❌ Failed to connect to ElevenLabs API');
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.error('❌ API request timed out');
      resolve(false);
    });

    req.end();
  });
}

async function generateTTSAudio() {
  try {
    // Verify API key first
    const isValidKey = await verifyApiKey();
    if (!isValidKey) {
      throw new Error('API key verification failed');
    }
    
    // Create output directory structure
    const outputDir = path.join(__dirname, 'assets', 'voices');
    await fs.mkdir(outputDir, { recursive: true });
    
    console.log(`🎙️  Generating TTS audio files matching app structure...`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`📝 HQ Affirmations: ${HQ_AFFIRMATIONS.length}`);
    console.log(`📝 Preview Affirmations: ${PREVIEW_AFFIRMATIONS.length}`);
    console.log(`🔊 Voices: serenity (female), titan (male)`);
    console.log(`📊 Total files: ${HQ_AFFIRMATIONS.length * 2 * 2} (3 affirmations × 2 voices × 2 qualities)`);
    
    // Clean existing files
    await cleanExistingFiles(outputDir);
    
    // Generate for each voice
    for (const [voiceName, voiceConfig] of Object.entries(VOICE_CONFIGS)) {
      const voiceDir = path.join(outputDir, voiceName);
      await fs.mkdir(voiceDir, { recursive: true });
      
      console.log(`\n🎤 Generating ${voiceName} voice files...`);
      
      // Generate each affirmation
      for (let i = 0; i < HQ_AFFIRMATIONS.length; i++) {
        const hqText = HQ_AFFIRMATIONS[i];
        const previewText = PREVIEW_AFFIRMATIONS[i];
        
        console.log(`\n📝 [${voiceName}] HQ: "${hqText}"`);
        console.log(`📝 [${voiceName}] Preview: "${previewText}"`);
        
        try {
          // Generate HQ version
          const hqBuffer = await makeElevenLabsRequest(hqText, voiceConfig.id, voiceConfig.settings);
          const hqPath = path.join(voiceDir, `${i}-hq.mp3`);
          await fs.writeFile(hqPath, hqBuffer);
          console.log(`✅ Generated: ${voiceName}/${i}-hq.mp3 (${hqBuffer.length} bytes)`);
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Generate preview version with different affirmation
          const previewBuffer = await makeElevenLabsRequest(previewText, voiceConfig.id, voiceConfig.settings);
          const previewPath = path.join(voiceDir, `${i}-preview.mp3`);
          await fs.writeFile(previewPath, previewBuffer);
          console.log(`✅ Generated: ${voiceName}/${i}-preview.mp3 (${previewBuffer.length} bytes)`);
          
          // Longer delay between affirmations to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Error generating ${voiceName} affirmation ${i}:`, error.message);
          continue;
        }
      }
      
      console.log(`🎉 Completed ${voiceName} voice!`);
    }
    
    console.log(`\n🎉 All audio files generated successfully!`);
    console.log('\n📋 Next steps:');
    console.log('1. Test the audio files in your React Native app');
    console.log('2. Files are automatically placed in the correct directory structure');
    console.log('3. App should immediately use the new audio files');
    console.log('\n📊 Generated files:');
    
    // List generated files
    for (const voiceName of Object.keys(VOICE_CONFIGS)) {
      console.log(`\n${voiceName}/`);
      for (let i = 0; i < HQ_AFFIRMATIONS.length; i++) {
        console.log(`  ${i}-hq.mp3      "${HQ_AFFIRMATIONS[i]}"`);
        console.log(`  ${i}-preview.mp3 "${PREVIEW_AFFIRMATIONS[i]}"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    console.log('\n🔧 Setup instructions:');
    console.log('1. Sign up at https://elevenlabs.io (free tier: 10,000 characters/month)');
    console.log('2. Get your API key from https://elevenlabs.io/app/speech-synthesis');
    console.log('3. Set environment variable: export ELEVENLABS_API_KEY="your_key_here"');
    console.log('4. Run this script: node generate-tts-audio.js');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTTSAudio();
  // cleanExistingFiles()
  // verifyApiKey()
}

export { generateTTSAudio, HQ_AFFIRMATIONS, PREVIEW_AFFIRMATIONS, VOICE_CONFIGS };