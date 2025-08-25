#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const MANIFEST_PATH = path.join(__dirname, 'assets', 'voices', 'affirmations-manifest.json');

/**
 * Make API request to create manifestation
 */
function createManifestation(assetUrl, content) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      asset_url: assetUrl,
      content: content
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/manifestations',
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
 * Main function to upload all manifestations
 */
async function uploadManifestations() {
  try {
    // Read the manifest file
    console.log('📄 Reading manifest file...');
    const manifestContent = await fs.readFile(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    console.log(`\n🎯 Found ${manifest.playlists.length} playlists to process`);
    console.log(`🌐 API Base URL: ${API_BASE_URL}\n`);
    
    let totalUploaded = 0;
    let totalFailed = 0;
    
    // Process each playlist
    for (const playlist of manifest.playlists) {
      console.log(`\n📂 Processing playlist: ${playlist.name} (${playlist.id})`);
      console.log(`   Affirmations: ${playlist.affirmations.length}`);
      
      // Process each affirmation
      for (const affirmation of playlist.affirmations) {
        // Use just the filename as asset_url
        const assetUrl = affirmation.fileName;
        
        console.log(`\n   📤 Uploading affirmation ${affirmation.index + 1}/${playlist.affirmations.length}`);
        console.log(`      Text: "${affirmation.text}"`);
        console.log(`      Asset: ${assetUrl}`);
        
        try {
          // Create manifestation in database
          const result = await createManifestation(
            assetUrl,
            affirmation.text
          );
          
          console.log(`      ✅ Success! Manifestation ID: ${result.id || 'created'}`);
          totalUploaded++;
          
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`      ❌ Failed: ${error.message}`);
          totalFailed++;
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Upload Summary:');
    console.log(`   ✅ Successfully uploaded: ${totalUploaded}`);
    console.log(`   ❌ Failed uploads: ${totalFailed}`);
    console.log(`   📈 Total processed: ${totalUploaded + totalFailed}`);
    console.log('='.repeat(60) + '\n');
    
    if (totalFailed > 0) {
      console.log('⚠️  Some uploads failed. Check the errors above and retry if needed.');
    } else {
      console.log('🎉 All manifestations uploaded successfully!');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting manifestation upload to database...\n');
  uploadManifestations();
}

export { uploadManifestations, createManifestation };