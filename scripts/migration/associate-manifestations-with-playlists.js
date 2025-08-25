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

/**
 * Make API request to get all manifestations
 */
function getAllManifestations() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/manifestations?limit=200', // Get all manifestations
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
 * Create playlist-manifestation association using SQL query
 */
function createPlaylistManifestation(playlistId, manifestationId, position) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      query: `
        INSERT INTO playlist_manifestations (playlist_id, manifestation_id, position)
        VALUES ($1, $2, $3)
        ON CONFLICT (playlist_id, manifestation_id) DO UPDATE SET
          position = EXCLUDED.position
        RETURNING *;
      `,
      params: [playlistId, manifestationId, position]
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/sql', // Assuming there's a SQL endpoint
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
        if (res.statusCode === 200 || res.statusCode === 201) {
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
 * Bulk create playlist-manifestation associations using API
 */
function bulkCreatePlaylistManifestations(associations) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      associations: associations
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/playlist-manifestations/bulk',
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
        if (res.statusCode === 200 || res.statusCode === 201) {
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
 * Extract playlist ID from asset filename
 */
function extractPlaylistIdFromFilename(filename) {
  // Filename format: {playlistId}-{index}-charlotte.mp3
  const match = filename.match(/^([a-f0-9-]+)-\d+-charlotte\.mp3$/);
  return match ? match[1] : null;
}

/**
 * Extract index from asset filename
 */
function extractIndexFromFilename(filename) {
  // Filename format: {playlistId}-{index}-charlotte.mp3
  const match = filename.match(/^[a-f0-9-]+-(\d+)-charlotte\.mp3$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Main function to associate manifestations with playlists
 */
async function associateManifestationsWithPlaylists() {
  try {
    console.log('🚀 Starting playlist-manifestation association process...\n');

    // Read the manifest file to understand the structure
    console.log('📄 Reading manifest file...');
    const manifestContent = await fs.readFile(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Get all manifestations from API
    console.log('📋 Fetching manifestations from API...');
    const { manifestations } = await getAllManifestations();
    
    console.log(`\n🎯 Found ${manifestations.length} manifestations to process`);
    console.log(`🎭 Found ${manifest.playlists.length} playlists in manifest`);
    
    // Create playlist lookup by ID
    const playlistsById = {};
    manifest.playlists.forEach(playlist => {
      playlistsById[playlist.id] = playlist;
    });

    // Process manifestations and create associations
    const associations = [];
    let successCount = 0;
    let errorCount = 0;

    console.log('\n🔗 Processing manifestations...\n');

    for (const manifestation of manifestations) {
      const filename = manifestation.asset_url;
      const manifestationId = manifestation.id;
      
      console.log(`   📤 Processing: ${filename} (ID: ${manifestationId})`);

      // Extract playlist ID from filename
      const playlistId = extractPlaylistIdFromFilename(filename);
      if (!playlistId) {
        console.log(`   ⚠️  Could not extract playlist ID from filename: ${filename}`);
        errorCount++;
        continue;
      }

      // Check if playlist exists in our manifest
      const playlist = playlistsById[playlistId];
      if (!playlist) {
        console.log(`   ⚠️  Playlist ${playlistId} not found in manifest`);
        errorCount++;
        continue;
      }

      // Extract position from filename
      const position = extractIndexFromFilename(filename);
      
      console.log(`   🔗 Linking to playlist: ${playlist.name} (position ${position})`);

      // Create association object
      associations.push({
        playlist_id: playlistId,
        manifestation_id: manifestationId,
        position: position
      });

      successCount++;
    }

    console.log(`\n📊 Association Summary:`);
    console.log(`   ✅ Ready to link: ${successCount}`);
    console.log(`   ❌ Errors/skipped: ${errorCount}`);

    if (associations.length === 0) {
      console.log('❌ No associations to create. Exiting.');
      return;
    }

    // Use bulk API to create all associations
    console.log('\n🚀 Creating associations using API...');
    
    try {
      const result = await bulkCreatePlaylistManifestations(associations);
      
      console.log(`✅ Successfully created ${result.total} playlist-manifestation associations!`);
      console.log('\n🎉 All associations have been created in the database!');
      
    } catch (apiError) {
      console.error(`❌ API Error: ${apiError.message}`);
      console.log('\n📝 Falling back to SQL generation...');
      
      // Fallback: Generate SQL file
      const sqlInserts = associations.map(assoc => 
        `INSERT INTO playlist_manifestations (playlist_id, manifestation_id, position) VALUES ('${assoc.playlist_id}', ${assoc.manifestation_id}, ${assoc.position}) ON CONFLICT (playlist_id, manifestation_id) DO UPDATE SET position = EXCLUDED.position;`
      );

      const sqlFilePath = path.join(__dirname, 'insert-playlist-manifestations.sql');
      const sqlContent = [
        '-- Generated playlist-manifestation associations',
        '-- Run this in your Supabase SQL editor',
        '',
        ...sqlInserts,
        '',
        `-- Summary: ${associations.length} associations created`
      ].join('\n');
      
      await fs.writeFile(sqlFilePath, sqlContent);
      console.log(`📁 SQL file written to: ${sqlFilePath}`);
      console.log('📋 Next steps:');
      console.log('   1. Run the SQL file in your database');
      console.log('   2. Test the associations');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  associateManifestationsWithPlaylists();
}

export { associateManifestationsWithPlaylists };