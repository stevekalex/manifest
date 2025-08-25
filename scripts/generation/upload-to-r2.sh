#!/bin/bash

# Upload all affirmation files to Cloudflare R2

echo "🚀 Starting upload to Cloudflare R2..."

# Change to the voices directory
cd assets/voices

# Upload the manifest file
echo "📄 Uploading manifest..."
wrangler r2 object put manifest-meditations/affirmations-manifest.json --file affirmations-manifest.json

# Upload all charlotte voice files
echo "🎤 Uploading Charlotte voice files..."
cd charlotte
for file in *.mp3; do
  echo "⬆️  Uploading: $file"
  wrangler r2 object put "manifest-meditations/voices/charlotte/$file" --file "$file"
done

echo "✅ Upload complete!"