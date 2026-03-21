import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const buildDir = path.join(rootDir, "build");
const iconsDir = path.join(buildDir, "icons");
const macIconDir = path.join(iconsDir, "mac");
const pngDir = path.join(iconsDir, "png");

// Ensure directories exist
for (const dir of [buildDir, iconsDir, macIconDir, pngDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Create a clock/timer icon SVG
function createClockIconSVG(size, color = "#1B96FE", bgColor = "#ffffff") {
  const center = size / 2;
  const radius = size * 0.4;
  const hourHandLength = radius * 0.5;
  const minuteHandLength = radius * 0.7;
  const strokeWidth = size * 0.06;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${center}" cy="${center}" r="${radius}" fill="${bgColor}" stroke="${color}" stroke-width="${strokeWidth}"/>
  <line x1="${center}" y1="${center}" x2="${center}" y2="${center - hourHandLength}" stroke="${color}" stroke-width="${strokeWidth * 0.8}" stroke-linecap="round"/>
  <line x1="${center}" y1="${center}" x2="${center + minuteHandLength * 0.7}" y2="${center - minuteHandLength * 0.7}" stroke="${color}" stroke-width="${strokeWidth * 0.6}" stroke-linecap="round"/>
  <circle cx="${center}" cy="${center}" r="${strokeWidth * 0.4}" fill="${color}"/>
</svg>`;
}

// Create a monochrome tray icon (for dark menu bar)
function createTrayIconSVG(size, color = "#ffffff") {
  const center = size / 2;
  const radius = size * 0.4;
  const minuteHandLength = radius * 0.7;
  const strokeWidth = Math.max(1, size * 0.06);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>
  <line x1="${center}" y1="${center}" x2="${center}" y2="${center - minuteHandLength}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
  <line x1="${center}" y1="${center}" x2="${center + minuteHandLength * 0.5}" y2="${center + minuteHandLength * 0.5}" stroke="${color}" stroke-width="${strokeWidth * 0.7}" stroke-linecap="round"/>
  <circle cx="${center}" cy="${center}" r="${strokeWidth * 0.5}" fill="${color}"/>
</svg>`;
}

async function generateIcons() {
  console.log("Generating app icons...");

  // Create iconset directory for icns generation
  const iconSetDir = path.join(macIconDir, "icon.iconset");
  if (!fs.existsSync(iconSetDir)) {
    fs.mkdirSync(iconSetDir, { recursive: true });
  }

  // Generate iconset images with correct naming for icns
  const iconSetSizes = [
    { name: "icon_16x16", size: 16 },
    { name: "icon_16x16@2x", size: 32 },
    { name: "icon_32x32", size: 32 },
    { name: "icon_32x32@2x", size: 64 },
    { name: "icon_128x128", size: 128 },
    { name: "icon_128x128@2x", size: 256 },
    { name: "icon_256x256", size: 256 },
    { name: "icon_256x256@2x", size: 512 },
    { name: "icon_512x512", size: 512 },
    { name: "icon_512x512@2x", size: 1024 },
  ];

  for (const { name, size } of iconSetSizes) {
    const svg = createClockIconSVG(size);
    const pngPath = path.join(iconSetDir, `${name}.png`);
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    console.log(`Created ${name}.png (${size}x${size})`);
  }

  // Also create individual PNGs in mac folder for reference
  const sizes = [16, 32, 64, 128, 256, 512, 1024];
  for (const size of sizes) {
    const svg = createClockIconSVG(size);
    const pngPath = path.join(macIconDir, `${size}x${size}.png`);
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    console.log(`Created ${size}x${size}.png`);
  }

  // Generate 512x512 and 256x256 for general use
  const svg512 = createClockIconSVG(512);
  await sharp(Buffer.from(svg512)).png().toFile(path.join(pngDir, "512x512.png"));
  console.log("Created 512x512.png");

  const svg256 = createClockIconSVG(256);
  await sharp(Buffer.from(svg256)).png().toFile(path.join(pngDir, "256x256.png"));
  console.log("Created 256x256.png");

  // Generate favicon.png
  const svgFavicon = createClockIconSVG(32);
  await sharp(Buffer.from(svgFavicon)).png().toFile(path.join(buildDir, "favicon.png"));
  console.log("Created favicon.png (PNG format, works in modern browsers)");

  // Create favicon.ico placeholder
  fs.copyFileSync(path.join(pngDir, "256x256.png"), path.join(buildDir, "favicon.ico"));
  console.log("Created favicon.ico (placeholder - consider using png2icons for proper ICO)");

  // Generate tray icons
  console.log("\nGenerating tray icons...");
  const traySvg22 = createTrayIconSVG(22);
  const traySvg44 = createTrayIconSVG(44); // @2x for Retina

  await sharp(Buffer.from(traySvg22)).png().toFile(path.join(buildDir, "tray-icon.png"));
  await sharp(Buffer.from(traySvg44)).png().toFile(path.join(buildDir, "tray-icon@2x.png"));
  console.log("Created tray-icon.png (22x22) and tray-icon@2x.png (44x44)");

  console.log("\nIcon generation complete!");
  console.log("App icons:", macIconDir);
  console.log("PNG icons:", pngDir);
  console.log("Tray icons:", buildDir);
  console.log("Favicon:", path.join(buildDir, "favicon.png"));

  // Create .icns file using iconutil (macOS only)
  const { execSync } = await import("node:child_process");
  const iconSetPath = path.join(macIconDir, "icon.iconset");
  const icnsPath = path.join(macIconDir, "icon");

  try {
    execSync(`iconutil -c icns "${iconSetPath}" -o "${icnsPath}"`, { stdio: "inherit" });
    console.log("\nCreated icon.icns using iconutil");
  } catch (error) {
    console.warn("Could not create .icns file:", error.message);
    console.log("You may need to create it manually using iconutil or a tool like png2icons");
  }
}

generateIcons().catch(console.error);
