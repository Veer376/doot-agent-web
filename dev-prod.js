import { spawn } from 'child_process';
import dotenv from 'dotenv';

// Load production environment variables
const result = dotenv.config({ path: '.env.production.local' });

if (result.error) {
  console.warn('Warning: .env.production.local file not found or could not be loaded.');
}

// Run next dev
// We use 'npm run dev' to ensure we use the local next binary and settings
const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env } // Explicitly pass the modified environment
});

child.on('exit', (code) => {
  process.exit(code);
});
