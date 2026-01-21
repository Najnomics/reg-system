import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Icon configuration
const icons = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 }
];

// Create an SVG icon with church theme
function createIconSVG(size) {
  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.2}"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(${size * 0.6 / 100})">
    <!-- Church building icon -->
    <path d="M50 20 L30 40 L30 80 L70 80 L70 40 Z" fill="white" opacity="0.9"/>
    <rect x="45" y="80" width="10" height="20" fill="white" opacity="0.9"/>
    <circle cx="50" cy="30" r="8" fill="#fbbf24"/>
    <path d="M50 20 L45 30 L55 30 Z" fill="#fbbf24"/>
  </g>
  <!-- Cross on top -->
  <line x1="${size * 0.5}" y1="${size * 0.15}" x2="${size * 0.5}" y2="${size * 0.35}" 
        stroke="white" stroke-width="${size * 0.03}" stroke-linecap="round"/>
  <line x1="${size * 0.4}" y1="${size * 0.25}" x2="${size * 0.6}" y2="${size * 0.25}" 
        stroke="white" stroke-width="${size * 0.03}" stroke-linecap="round"/>
</svg>
  `.trim();
}

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  for (const icon of icons) {
    try {
      const svg = createIconSVG(icon.size);
      const outputPath = path.join(publicDir, icon.name);

      await sharp(Buffer.from(svg))
        .png()
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 79, g: 70, b: 229, alpha: 1 }
        })
        .toFile(outputPath);

      console.log(`✅ Created ${icon.name} (${icon.size}x${icon.size}px)`);
    } catch (error) {
      console.error(`❌ Error creating ${icon.name}:`, error.message);
    }
  }

  console.log('\n✨ All icons generated successfully!');
  console.log(`📁 Icons saved to: ${publicDir}`);
}

generateIcons().catch(console.error);
