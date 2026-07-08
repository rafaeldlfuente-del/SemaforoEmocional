import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcImage = './src/assets/images/pwa_logo_1783495105488.jpg';
const destDir = './public/icons';

async function generateIcons() {
  try {
    if (!fs.existsSync(destDir)){
      fs.mkdirSync(destDir, { recursive: true });
    }

    console.log(`Processing source image: ${srcImage}`);
    
    // Generate 192x192 PNG
    await sharp(srcImage)
      .resize(192, 192)
      .png()
      .toFile(path.join(destDir, 'icon-192.png'));
    console.log('Generated icon-192.png successfully.');

    // Generate 512x512 PNG
    await sharp(srcImage)
      .resize(512, 512)
      .png()
      .toFile(path.join(destDir, 'icon-512.png'));
    console.log('Generated icon-512.png successfully.');

    console.log('PWA Icons generation complete!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
