import fs from 'fs';
import path from 'path';

const baseDir = process.cwd();

// Ensure required directories exist
const requiredDirs = [
  path.join('reports', 'html'),
  path.join('reports', 'json'),
  path.join('reports', 'traces'),
  path.join('reports', 'screenshots'),
  '.auth',
];

console.log('Setting up TestHub...\n');

for (const dir of requiredDirs) {
  const fullPath = path.join(baseDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created: ${dir}`);
  }
}

// Check for environment config
const localEnvPath = path.join(baseDir, 'config', 'environments', 'local.env');
const envExamplePath = path.join(baseDir, '.env.example');

if (!fs.existsSync(localEnvPath)) {
  console.log('\nWarning: config/environments/local.env not found.');
  console.log('Copy from template and configure:');
  console.log('  cp .env.example config/environments/local.env');
}

console.log('\nSetup complete!');
console.log('\nQuick start:');
console.log('  1. Configure config/environments/local.env');
console.log('  2. Start your application locally');
console.log('  3. Run: npm run test:smoke');
