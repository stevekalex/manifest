#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const MANIFEST_PATH = path.join(__dirname, 'assets', 'voices', 'affirmations-manifest.json');

// Theme mapping - maps playlist names to theme slugs
const THEME_MAPPING = {
  // Financial/Wealth themes
  'Wealth Consciousness': 'financial-success',
  'Abundance Affirmations': 'financial-success',
  
  // Confidence themes  
  'I Am Powerful Affirmations': 'become-confident',
  'Self-Love Meditations': 'become-confident',
  
  // Popular content
  'Viral Success Stories': 'popular-now',
  'Trending Affirmations': 'popular-now',
  
  // Personalized content
  'Custom Vision Board Meditations': 'just-for-you',
  'Powerful Morning Affirmations': 'just-for-you'
};

/**
 * Make API request to get all themes
 */
function getThemes() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/themes',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Link playlist to theme using API
 */
function linkPlaylistToTheme(themeId, playlistId, position = 0) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ position });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/v1/themes/${themeId}/playlists/${playlistId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`API error: ${res.statusCode} - ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Main function to link themes to playlists
 */
async function linkThemesToPlaylists() {
  try {
    // Read the manifest file
    console.log('📄 Reading manifest file...');
    const manifestContent = await fs.readFile(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Get all themes from API
    console.log('🎨 Fetching themes from API...');
    const themes = await getThemes();
    
    // Create theme lookup by slug
    const themesBySlug = {};
    themes.forEach(theme => {
      themesBySlug[theme.slug] = theme;
    });

    console.log(`\n🎯 Found ${manifest.playlists.length} playlists to link`);
    console.log(`🌐 API Base URL: ${API_BASE_URL}\n`);

    let totalLinked = 0;
    let totalSkipped = 0;

    // Process each playlist in the manifest
    for (const playlist of manifest.playlists) {
      const playlistName = playlist.name;
      const playlistId = playlist.id;
      
      console.log(`\n📂 Processing playlist: ${playlistName}`);
      console.log(`   ID: ${playlistId}`);

      // Find the theme for this playlist
      const themeSlug = THEME_MAPPING[playlistName];
      
      if (!themeSlug) {
        console.log(`   ⚠️  No theme mapping found for "${playlistName}" - skipping`);
        totalSkipped++;
        continue;
      }

      const theme = themesBySlug[themeSlug];
      if (!theme) {
        console.log(`   ❌ Theme "${themeSlug}" not found in database - skipping`);
        totalSkipped++;
        continue;
      }

      console.log(`   🔗 Linking to theme: ${theme.name} (${theme.slug})`);

      try {
        // Link playlist to theme
        const result = await linkPlaylistToTheme(theme.id, playlistId, totalLinked);
        
        console.log(`   ✅ Success! Linked playlist to theme`);
        totalLinked++;
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        if (error.message.includes('duplicate key value')) {
          console.log(`   ℹ️  Already linked - skipping`);
          totalSkipped++;
        } else {
          console.error(`   ❌ Failed: ${error.message}`);
          totalSkipped++;
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Linking Summary:');
    console.log(`   ✅ Successfully linked: ${totalLinked}`);
    console.log(`   ⏭️  Skipped: ${totalSkipped}`);
    console.log(`   📈 Total processed: ${totalLinked + totalSkipped}`);
    console.log('='.repeat(60) + '\n');

    if (totalSkipped > 0) {
      console.log('ℹ️  Some playlists were skipped (already linked or no theme mapping).');
    }
    
    if (totalLinked > 0) {
      console.log('🎉 Theme-playlist associations created successfully!');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting theme-playlist linking process...\n');
  linkThemesToPlaylists();
}

export { linkThemesToPlaylists };