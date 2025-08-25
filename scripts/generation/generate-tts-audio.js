#!/usr/bin/env node

// TTS Generation enabled - using ElevenLabs API
console.log('🎤 TTS Generation Script - Using ElevenLabs with Charlotte voice');

import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

dotenv.config();

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ElevenLabs configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Voice configuration for Charlotte - warm, supportive feminine voice
const VOICE_CONFIGS = {
  charlotte: {
    id: 'XB0fDUnXU5powFXDhCwa', // Charlotte - warm, supportive voice
    settings: {
      stability: 0.75,           // Balanced for natural warmth
      similarity_boost: 0.70,    // Slightly lower for softer, warmer tone
      style: 0.35,              // More expressive for emotional connection
      use_speaker_boost: false,  // Natural sound without enhancement
      speaking_rate: 0.82,       // Slower pace for meditation
    },
    model_id: "eleven_multilingual_v2", // Highest quality model
    output_format: "mp3_44100_64",      // Premium audio quality
    apply_text_normalization: "auto"
  }
};

// Function to fetch playlists from API
async function fetchPlaylistsFromAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/homefeed',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const allPlaylists = [];
          
          // Extract all playlists from themes
          if (response.themes && Array.isArray(response.themes)) {
            response.themes.forEach(theme => {
              if (theme.playlists && Array.isArray(theme.playlists)) {
                allPlaylists.push(...theme.playlists);
              }
            });
          }
          
          console.log(`📋 Found ${allPlaylists.length} playlists from API`);
          resolve(allPlaylists);
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('API request timed out'));
    });
    
    req.end();
  });
}

// Function to generate custom affirmations based on playlist
function generateAffirmationsForPlaylist(playlist) {
  const { name, description } = playlist;
  const affirmations = [];
  
  // Create themed affirmations based on playlist name and description
  const themes = {
    wealth: ["abundance", "prosperity", "money", "financial", "wealth", "rich", "affluent"],
    confidence: ["confident", "self-love", "powerful", "worthy", "strong", "bold", "empowered"],
    success: ["success", "achieve", "goal", "dream", "accomplish", "victory", "triumph"],
    manifestation: ["manifest", "attract", "magnetize", "create", "visualization", "intention"],
    peace: ["calm", "peace", "serene", "tranquil", "relax", "mindful", "meditation"],
    love: ["love", "relationship", "heart", "compassion", "connection", "romance"],
    health: ["health", "wellness", "vital", "energy", "healing", "vibrant"],
    spiritual: ["divine", "universe", "spiritual", "soul", "higher self", "consciousness"],
  };
  
  // Determine primary theme
  let primaryTheme = 'general';
  const combinedText = `${name} ${description}`.toLowerCase();
  
  for (const [theme, keywords] of Object.entries(themes)) {
    if (keywords.some(keyword => combinedText.includes(keyword))) {
      primaryTheme = theme;
      break;
    }
  }
  
  // Generate affirmations based on theme
  const affirmationTemplates = {
    wealth: [
      "I am a magnet for abundance and prosperity",
      "Money flows to me easily and effortlessly",
      "I am worthy of unlimited financial success",
      "I attract wealth with every breath I take",
      "My income is constantly increasing",
      "I am financially free and secure",
      "Abundance is my natural state of being",
      "I deserve to be prosperous and wealthy",
      "Money comes to me from expected and unexpected sources",
      "I am grateful for the wealth that surrounds me",
      "I release all resistance to receiving abundance",
      "My bank account is overflowing with money",
      "I am aligned with the energy of wealth",
      "Success and prosperity are drawn to me",
      "I am open to receiving infinite abundance"
    ],
    confidence: [
      "I am confident and capable in all that I do",
      "I love and accept myself completely",
      "My self-worth is inherent and unshakeable",
      "I trust myself to make the right decisions",
      "I am powerful beyond measure",
      "I radiate confidence and self-assurance",
      "I am worthy of love and respect",
      "My confidence grows stronger every day",
      "I believe in my abilities and talents",
      "I am enough exactly as I am",
      "I stand tall in my personal power",
      "I embrace my unique qualities with pride",
      "I am fearless in pursuit of my dreams",
      "My inner strength guides me forward",
      "I am the architect of my own confidence"
    ],
    success: [
      "Success comes naturally to me",
      "I am destined for greatness",
      "Every day I move closer to my goals",
      "I manifest my dreams with ease",
      "Success is my birthright",
      "I achieve everything I set my mind to",
      "My potential for success is limitless",
      "I attract opportunities for growth and success",
      "I am focused on creating my ideal life",
      "Success flows through me effortlessly",
      "I am worthy of all my dreams coming true",
      "I take inspired action toward my goals",
      "The universe conspires to help me succeed",
      "I am living my purpose with passion",
      "My success benefits everyone around me"
    ],
    peace: [
      "I am at peace with myself and the world",
      "Calmness washes over me with each breath",
      "I release all tension and embrace tranquility",
      "My mind is clear and my heart is calm",
      "I am grounded in the present moment",
      "Peace flows through every cell of my being",
      "I choose serenity in every situation",
      "I am centered and balanced",
      "Tranquility is my natural state",
      "I let go of worry and embrace peace",
      "My inner peace radiates outward",
      "I am calm, relaxed, and at ease",
      "Peace begins with me",
      "I trust the flow of life",
      "I am safe and secure in this moment"
    ],
    love: [
      "I am worthy of deep and meaningful love",
      "Love flows to me and through me effortlessly",
      "I attract loving relationships into my life",
      "My heart is open to giving and receiving love",
      "I radiate love and it returns to me multiplied",
      "I deserve to be loved exactly as I am",
      "I am surrounded by love in all its forms",
      "I choose love in every moment",
      "My relationships are filled with joy and harmony",
      "I attract my perfect partner with ease",
      "Love is my natural state of being",
      "I am magnetic to healthy, loving relationships",
      "I give and receive love freely",
      "My life is enriched by loving connections",
      "I am love, I am loved, I am loving"
    ],
    health: [
      "My body is healthy, strong, and vibrant",
      "I am grateful for my perfect health",
      "Every cell in my body radiates wellness",
      "I choose thoughts that support my wellbeing",
      "My body knows how to heal itself perfectly",
      "I am filled with energy and vitality",
      "I nurture my body with love and care",
      "Perfect health is my natural state",
      "I breathe in healing and breathe out gratitude",
      "My immune system is strong and protective",
      "I listen to my body's wisdom",
      "I am whole, healthy, and complete",
      "Wellness flows through every part of me",
      "I choose habits that support my health",
      "I am grateful for my body's strength"
    ],
    spiritual: [
      "I am connected to the divine wisdom within me",
      "My soul is aligned with its highest purpose",
      "I trust the spiritual journey I am on",
      "Divine guidance flows through me constantly",
      "I am one with the infinite universe",
      "My spiritual growth unfolds perfectly",
      "I am open to receiving divine messages",
      "My higher self guides every decision I make",
      "I am a spiritual being having a human experience",
      "Sacred energy flows through me",
      "I honor the divine light within me",
      "My consciousness expands with each breath",
      "I am connected to all that is",
      "The universe speaks to me through synchronicity",
      "I embrace my spiritual awakening with grace"
    ],
    manifestation: [
      "I manifest my desires with ease and grace",
      "My thoughts create my reality",
      "I am a powerful creator of my life",
      "What I visualize, I materialize",
      "I attract miracles into my life every day",
      "My manifestations come to me at the perfect time",
      "I am aligned with the frequency of my desires",
      "The universe conspires to manifest my dreams",
      "I trust the manifestation process completely",
      "My intentions are powerful and magnetic",
      "I manifest from a place of love and gratitude",
      "Everything I desire is already mine",
      "I am worthy of all my manifestations",
      "My vibration attracts my perfect reality",
      "I manifest abundance in all areas of my life"
    ],
    general: [
      "I am exactly where I need to be",
      "The universe supports me in every way",
      "I am worthy of all good things",
      "My life is filled with infinite possibilities",
      "I trust my journey completely",
      "I am grateful for this beautiful life",
      "Everything works out for my highest good",
      "I am divinely guided and protected",
      "I embrace change with grace and ease",
      "My intuition always leads me right",
      "I am connected to infinite wisdom",
      "Life flows through me with ease",
      "I am whole and complete",
      "Every day brings new blessings",
      "I am exactly who I am meant to be"
    ]
  };
  
  // Select appropriate affirmations
  const selectedAffirmations = affirmationTemplates[primaryTheme] || affirmationTemplates.general;
  
  // If we have a specific playlist name, customize the first affirmation
  if (name) {
    affirmations.push(`I embrace the power of ${name}`);
  }
  
  // Add the remaining affirmations
  affirmations.push(...selectedAffirmations.slice(0, 14));
  
  // Ensure we have exactly 15 affirmations
  while (affirmations.length < 15) {
    affirmations.push(affirmationTemplates.general[affirmations.length]);
  }
  
  return affirmations.slice(0, 15);
}

// Helper function to make ElevenLabs API request
function makeElevenLabsRequest(text, voiceConfig) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      text: text,
      model_id: voiceConfig.model_id || "eleven_multilingual_v2",
      voice_settings: voiceConfig.settings
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: `/v1/text-to-speech/${voiceConfig.id}`,
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
    const voiceTypes = ['charlotte'];
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
    
    // Clean up old manifest if exists
    const manifestPath = path.join(outputDir, 'affirmations-manifest.json');
    try {
      await fs.unlink(manifestPath);
      console.log('🗑️  Deleted old manifest file');
    } catch (_err) {
      // Manifest might not exist, that's okay
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
    
    // Fetch playlists from API
    console.log('\n🌐 Fetching playlists from API...');
    const playlists = await fetchPlaylistsFromAPI();
    
    if (!playlists || playlists.length === 0) {
      throw new Error('No playlists found from API');
    }
    
    // Create output directory structure
    const outputDir = path.join(__dirname, 'assets', 'voices');
    await fs.mkdir(outputDir, { recursive: true });
    
    console.log(`\n🎙️  Generating TTS audio files for ${playlists.length} playlists...`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`🎤 Voice: Charlotte (warm, supportive feminine voice)`);
    console.log(`📊 Total affirmations to generate: ${playlists.length * 15}`);
    
    // Clean existing files
    await cleanExistingFiles(outputDir);
    
    // Manifest to track all generated files
    const manifest = {
      generatedAt: new Date().toISOString(),
      voice: VOICE_CONFIGS.charlotte,
      playlists: []
    };
    
    // Generate affirmations for each playlist
    for (const [playlistIndex, playlist] of playlists.entries()) {
      console.log(`\n🎵 Processing playlist ${playlistIndex + 1}/${playlists.length}: "${playlist.name}"`);
      console.log(`📝 Description: ${playlist.description || 'No description'}`);
      
      // Generate custom affirmations for this playlist
      const affirmations = generateAffirmationsForPlaylist(playlist);
      
      // Create playlist entry in manifest
      const playlistManifest = {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        affirmations: []
      };
      
      // Create voice directory
      const voiceDir = path.join(outputDir, 'charlotte');
      await fs.mkdir(voiceDir, { recursive: true });
      
      // Generate each affirmation
      for (let i = 0; i < affirmations.length; i++) {
        const affirmationText = affirmations[i];
        const fileName = `${playlist.id}-${i}-charlotte.mp3`;
        const filePath = path.join(voiceDir, fileName);
        
        console.log(`\n  💬 [${i + 1}/15] "${affirmationText}"`);
        
        try {
          // Generate audio
          const audioBuffer = await makeElevenLabsRequest(affirmationText, VOICE_CONFIGS.charlotte);
          await fs.writeFile(filePath, audioBuffer);
          console.log(`  ✅ Generated: ${fileName} (${audioBuffer.length} bytes)`);
          
          // Add to manifest
          playlistManifest.affirmations.push({
            index: i,
            fileName: fileName,
            text: affirmationText,
            fileSize: audioBuffer.length,
            relativePath: `charlotte/${fileName}`
          });
          
          // Delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`  ❌ Error generating affirmation ${i}:`, error.message);
          
          // Add error entry to manifest
          playlistManifest.affirmations.push({
            index: i,
            fileName: fileName,
            text: affirmationText,
            error: error.message,
            relativePath: `charlotte/${fileName}`
          });
        }
      }
      
      manifest.playlists.push(playlistManifest);
      console.log(`✅ Completed playlist: ${playlist.name}`);
    }
    
    // Save manifest
    const manifestPath = path.join(outputDir, 'affirmations-manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\n📄 Manifest saved to: ${manifestPath}`);
    
    // Summary
    console.log(`\n🎉 TTS generation completed!`);
    console.log(`\n📊 Summary:`);
    console.log(`  - Playlists processed: ${manifest.playlists.length}`);
    console.log(`  - Total affirmations: ${manifest.playlists.reduce((sum, p) => sum + p.affirmations.length, 0)}`);
    console.log(`  - Successful generations: ${manifest.playlists.reduce((sum, p) => sum + p.affirmations.filter(a => !a.error).length, 0)}`);
    console.log(`  - Failed generations: ${manifest.playlists.reduce((sum, p) => sum + p.affirmations.filter(a => a.error).length, 0)}`);
    
    console.log('\n📋 Next steps:');
    console.log('1. Upload the generated files to your CDN');
    console.log('2. Use the manifest to map files to CDN URLs');
    console.log('3. Update your database with the CDN URLs');
    console.log('4. The app can then use these URLs for playback');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n🔧 Setup instructions:');
      console.log('1. Sign up at https://elevenlabs.io (free tier: 10,000 characters/month)');
      console.log('2. Get your API key from https://elevenlabs.io/app/speech-synthesis');
      console.log('3. Set environment variable: export ELEVENLABS_API_KEY="your_key_here"');
      console.log('4. Run this script: node generate-tts-audio.js');
    } else if (error.message.includes('API')) {
      console.log('\n🔧 Make sure your API server is running on http://localhost:3000');
    }
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTTSAudio();
  // cleanExistingFiles()
  // verifyApiKey()
}

export { generateTTSAudio, generateAffirmationsForPlaylist, VOICE_CONFIGS };