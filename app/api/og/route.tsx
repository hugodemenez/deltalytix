// app/api/og/route.tsx
import { createCanvas, loadImage } from 'canvas';
import { NextRequest } from 'next/server';
import sharp from 'sharp';

// Convert HSL to RGB hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Generate a color from a string (referral code)
function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate vibrant colors (avoid too dark colors)
  const hue = Math.abs(hash % 360);
  const saturation = 60 + (Math.abs(hash >> 8) % 30); // 60-90%
  const lightness = 50 + (Math.abs(hash >> 16) % 20); // 50-70%
  
  return hslToHex(hue, saturation, lightness);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get('ref') ?? 'Direct';

  // Generate color from referral code if provided
  const accentColor = ref && ref !== 'Direct' 
    ? generateColorFromString(ref)
    : '#7c3aed'; // Default purple

  // Set canvas size (OG image standard size)
  const width = 1200;
  const height = 630;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new Response('Failed to create canvas context', { status: 500 });
  }

  // Background
  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, width, height);

  // Gradient in top-right corner - uses generated color from referral code
  const gradient = ctx.createRadialGradient(
    width,
    0,
    0,
    width,
    0,
    Math.max(width, height) * 0.6
  );
  gradient.addColorStop(0, accentColor);
  gradient.addColorStop(0.5, accentColor);
  gradient.addColorStop(1, 'rgba(15, 15, 15, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Blue light in bottom-left corner
  const bottomLeftGradient = ctx.createRadialGradient(
    0,
    height,
    0,
    0,
    height,
    Math.max(width, height) * 0.3
  );
  bottomLeftGradient.addColorStop(0, '#3b82f6');
  bottomLeftGradient.addColorStop(0.5, '#2563eb');
  bottomLeftGradient.addColorStop(1, 'rgba(15, 15, 15, 0)');
  ctx.fillStyle = bottomLeftGradient;
  ctx.fillRect(0, 0, width, height);

  const generateNoiseArray = (length: number) => {
    const noise = [Math.random() * 2 - 1];
    for (let i = 1; i < length; i++) {
      const nextValue = noise[i - 1] + (Math.random() * 0.4 - 0.2);
      noise.push(Math.max(-1, Math.min(1, nextValue)));
    }
    return noise;
  };

  const noiseArray = generateNoiseArray(Math.ceil(width / 5) + 1);
  const noiseArray2 = generateNoiseArray(Math.ceil(width / 5) + 1);

  // Draw wavy lines at the bottom
  const waveHeight = height * 0.15;
  const waveY = height - waveHeight;

  // Build a path along the teal wave, then down to the bottom to create a filled area
  const waveGradient = ctx.createLinearGradient(0, waveY, 0, height);
  waveGradient.addColorStop(0, 'rgba(20, 184, 166, 0.3)');
  waveGradient.addColorStop(1, '#0a5a50');

  // Create path for filled area beneath the teal wave
  ctx.beginPath();
  ctx.moveTo(0, waveY);
  for (let x = 0; x <= width; x += 5) {
    const noiseIndex = Math.floor(x / 5);
    const y = waveY + Math.sin(x * 0.01 - 1) * 30 + noiseArray[noiseIndex] * 20;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = waveGradient;
  ctx.fill();

  const redWaveGradient = ctx.createLinearGradient(0, waveY - 20, 0, height);
  redWaveGradient.addColorStop(0, 'rgba(220, 38, 38, 0.2)');
  redWaveGradient.addColorStop(1, 'rgba(200, 50, 50, 0.1)');

  // Create path for filled area beneath the red wave
  ctx.beginPath();
  ctx.moveTo(0, waveY - 20);
  for (let x = 0; x <= width; x += 5) {
    const noiseIndex = Math.floor(x / 5);
    const y = waveY - 20 + Math.sin(x * 0.01 + 1) * 30 + noiseArray2[noiseIndex] * 20;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = redWaveGradient;
  ctx.fill();

  // Teal/green wave
  ctx.strokeStyle = '#14b8a6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 5) {
    const noiseIndex = Math.floor(x / 5);
    const y = waveY + Math.sin(x * 0.01 - 1) * 30 + noiseArray[noiseIndex] * 20;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Red/coral wave
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 5) {
    const noiseIndex = Math.floor(x / 5);
    const y = waveY - 20 + Math.sin(x * 0.01 + 1) * 30 + noiseArray2[noiseIndex] * 20;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Draw logo using SVG from Logo component
  const logoSize = 240; // 2x the original triangle size for better visibility
  const spacing = -40; // Negative spacing to make text overlap the logo

  // Create SVG string from Logo component with white fill (matching dark mode styling)
  const logoSvg = `
    <svg viewBox="0 0 255 255" xmlns="http://www.w3.org/2000/svg" width="${logoSize}" height="${logoSize}">
    <g fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd">
        <path d="M159 63L127.5 0V255H255L236.5 218H159V63Z" />
        <path d="M-3.05176e-05 255L127.5 -5.96519e-06L127.5 255L-3.05176e-05 255ZM64 217L121 104L121 217L64 217Z" />
      </g>
    </svg>
  `.trim();

  // Convert SVG to PNG buffer using sharp
  const logoBuffer = await sharp(Buffer.from(logoSvg))
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
    })
    .png()
    .toBuffer();

  // Load the image and draw it on canvas
  const logoImage = await loadImage(logoBuffer);

  // Set font to measure text width
  ctx.font = 'bold 128px Inter, sans-serif';
  const text = 'Deltalytix';
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;

  // Calculate total width of logo + spacing + text
  const totalWidth = logoSize + spacing + textWidth;

  // Center horizontally: start position = (width - totalWidth) / 2
  const logoX = (width - totalWidth) / 2;
  const logoY = height / 2; // Center vertically

  // Draw logo centered vertically
  ctx.drawImage(logoImage, logoX, logoY - logoSize / 2, logoSize, logoSize);

  // Draw text "Deltalytix" - positioned to the right of the logo and vertically centered
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const textX = logoX + logoSize + spacing;
  const textY = logoY; // Vertically centered with the logo
  ctx.fillText(text, textX, textY);

  // Add noise texture to the background
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const noiseIntensity = 8; // Adjust for more/less noise (0-255)
  
  for (let i = 0; i < data.length; i += 4) {
    // Add noise to RGB channels, keep alpha unchanged
    const noise = (Math.random() - 0.5) * noiseIntensity;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
  }
  
  ctx.putImageData(imageData, 0, 0);

  // Convert canvas to buffer
  const buffer = canvas.toBuffer('image/png');

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, immutable',
    },
  });
}