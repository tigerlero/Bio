import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const dist = 'dist';
const dest = '../play3d';

// Patch index.html — replace type="module" with defer for file:// compatibility
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
fs.writeFileSync(path.join(dist, 'index.html'), html.replace('<script type="module"', '<script defer'), 'utf8');

// Remove old destination
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

// Copy dist to destination
fs.cpSync(dist, dest, { recursive: true });

// Copy logos if they exist
const logosSrc = 'public/logos';
if (fs.existsSync(logosSrc)) {
  const logosDest = path.join(dest, 'logos');
  fs.cpSync(logosSrc, logosDest, { recursive: true });
}

// Copy icons if they exist
const iconsSrc = 'public/icons';
if (fs.existsSync(iconsSrc)) {
  const iconsDest = path.join(dest, 'icons');
  fs.cpSync(iconsSrc, iconsDest, { recursive: true });
}

console.log('Deployed to ../play3d/');
