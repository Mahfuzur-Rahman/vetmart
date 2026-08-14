import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const artifactsDir = process.env.ARTIFACTS_DIR || path.join(process.cwd(), 'public', 'images');
const mappingFile = path.join(process.cwd(), 'scripts', 'cloudinary_mapping.json');

async function uploadImages() {
  if (!fs.existsSync(artifactsDir)) {
    console.log('No images directory found at', artifactsDir);
    return;
  }

  const files = fs.readdirSync(artifactsDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.webp'));
  const mapping: Record<string, string> = {};

  for (const file of files) {
    const filePath = path.join(artifactsDir, file);
    const baseNameMatch = file.match(/^([a-zA-Z0-9_]+?)_\d+\.(png|jpg|webp)$/);
    const baseName = baseNameMatch ? baseNameMatch[1] : file.replace(/\.(png|jpg|webp)$/, '');
    const publicId = `vetmart/seed/${baseName}`;

    console.log(`Uploading ${file} to Cloudinary as ${publicId}...`);
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: publicId,
        overwrite: true
      });
      mapping[baseName] = result.public_id;
      console.log(`Success: ${result.public_id}`);
    } catch (err) {
      console.error(`Failed to upload ${file}:`, err);
    }
  }

  const outputDir = path.dirname(mappingFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
  console.log('Saved mapping to', mappingFile);
}

uploadImages().catch(console.error);
