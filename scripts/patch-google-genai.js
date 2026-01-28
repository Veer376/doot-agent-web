#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const targetFile = join(__dirname, '../node_modules/@langchain/google-genai/dist/utils/common.js');

if (!existsSync(targetFile)) {
  console.log('⚠️  @langchain/google-genai not found, skipping patch');
  process.exit(0);
}

console.log('🔧 Patching @langchain/google-genai to support thinking blocks...');

try {
  let content = readFileSync(targetFile, 'utf8');
  
  // Check if already patched
  if (content.includes('Skip thinking blocks')) {
    console.log('✅ Already patched!');
    process.exit(0);
  }
  
  // Find and replace the error throwing line
  const originalPattern = /else if \("type" in content\) throw new Error\(`Unknown content type \$\{content\.type\}`\);/;
  const replacement = 'else if (content.type === "thinking") return void 0; // Skip thinking blocks - Gemini generates but cannot consume them\n    else if ("type" in content) throw new Error(`Unknown content type ${content.type}`);';
  
  if (!originalPattern.test(content)) {
    console.log('⚠️  Pattern not found - package may have been updated. Please check manually.');
    process.exit(0);
  }
  
  content = content.replace(originalPattern, replacement);
  writeFileSync(targetFile, content, 'utf8');
  
  console.log('✅ Successfully patched @langchain/google-genai!');
  console.log('   - Thinking blocks will now be filtered when sending to Gemini');
  console.log('   - Frontend will still receive thinking blocks from checkpoint');
} catch (error) {
  console.error('❌ Failed to patch @langchain/google-genai:', error.message);
  process.exit(1);
}
