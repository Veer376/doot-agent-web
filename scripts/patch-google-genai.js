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

console.log('🔧 Patching @langchain/google-genai...');

try {
  let content = readFileSync(targetFile, 'utf8');
  let patchCount = 0;

  // ============================================================
  // PATCH 1: Skip thinking blocks (Gemini generates but cannot consume them)
  // ============================================================
  if (!content.includes('Skip thinking blocks')) {
    const thinkingPattern = /else if \("type" in content\) throw new Error\(`Unknown content type \$\{content\.type\}`\);/;
    const thinkingReplacement = 'else if (content.type === "thinking") return void 0; // Skip thinking blocks - Gemini generates but cannot consume them\n    else if ("type" in content) throw new Error(`Unknown content type ${content.type}`);';

    if (thinkingPattern.test(content)) {
      content = content.replace(thinkingPattern, thinkingReplacement);
      console.log('  ✅ Patch 1: Thinking blocks filter');
      patchCount++;
    } else {
      console.log('  ⚠️  Patch 1: Thinking blocks pattern not found');
    }
  } else {
    console.log('  ✅ Patch 1: Thinking blocks already patched');
    patchCount++;
  }

  // ============================================================
  // PATCH 2: Handle undefined candidateContent (blocked/safety filtered responses) in non-streaming
  // ============================================================
  if (!content.includes('candidateContent is undefined')) {
    const partsPattern = /const \{ content: candidateContent, \.\.\.generationInfo \} = candidate;\s*\n\s*const functionCalls = candidateContent\.parts\?\.reduce/;

    if (partsPattern.test(content)) {
      const partsReplacement = `const { content: candidateContent, ...generationInfo } = candidate;
    // PATCH: Handle blocked/filtered responses where candidateContent is undefined
    if (!candidateContent) {
        console.warn('[google-genai patch] Response blocked or empty - no content in candidate');
        return {
            generations: [],
            llmOutput: { 
                filters: response.promptFeedback,
                finishReason: candidate.finishReason,
                safetyRatings: candidate.safetyRatings
            }
        };
    }
    const functionCalls = candidateContent.parts?.reduce`;
      content = content.replace(partsPattern, partsReplacement);
      console.log('  ✅ Patch 2: Handle undefined candidateContent (safety/blocked responses)');
      patchCount++;
    } else {
      // Alternative pattern matching handling
      const simplePartsPattern = /const functionCalls = candidateContent\.parts\?\.reduce/;
      if (simplePartsPattern.test(content) && !content.includes('candidateContent is undefined')) {
        const insertPattern = /(const \{ content: candidateContent[^}]*\} = candidate;)/;
        const insertReplacement = `$1
    // PATCH: Handle blocked/filtered responses where candidateContent is undefined
    if (!candidateContent) {
        console.warn('[google-genai patch] Response blocked or empty - no content in candidate');
        return {
            generations: [],
            llmOutput: { 
                filters: response.promptFeedback,
                finishReason: candidate.finishReason,
                safetyRatings: candidate.safetyRatings
            }
        };
    }`;
        content = content.replace(insertPattern, insertReplacement);
        console.log('  ✅ Patch 2: Handle undefined candidateContent (alternative pattern)');
        patchCount++;
      } else {
        console.log('  ⚠️  Patch 2: Could not find pattern to patch');
      }
    }
  } else {
    console.log('  ✅ Patch 2: candidateContent check already patched');
    patchCount++;
  }

  // ============================================================
  // PATCH 3: Handle undefined candidateContent in STREAMING chunks
  // ============================================================
  if (!content.includes('candidateContent is undefined (streaming)')) {
    // Regex allowing optional spaces in destructuring: { content: candidateContent, ...generationInfo }
    const streamingSimplePattern = /const \{ content: candidateContent,\s*\.\.\.generationInfo \} = candidate;\s*const functionCalls = candidateContent\.parts\?\.reduce\(\(acc, p\) => \{/;

    if (streamingSimplePattern.test(content)) {
      const streamingReplacement = `const { content: candidateContent, ...generationInfo } = candidate;
    // PATCH: Handle blocked/filtered responses where candidateContent is undefined (streaming)
    if (!candidateContent) {
        // Return a safe empty chunk with finish reason
        return new ChatGenerationChunk({
            text: "",
            message: new AIMessageChunk({
                content: "",
                response_metadata: { 
                    finishReason: candidate.finishReason,
                    safetyRatings: candidate.safetyRatings,
                    model_provider: "google-genai"
                }
            }),
            generationInfo
        });
    }
    const functionCalls = candidateContent.parts?.reduce((acc, p) => {`;

      content = content.replace(streamingSimplePattern, streamingReplacement);
      console.log('  ✅ Patch 3: Handle undefined candidateContent in streaming chunks');
      patchCount++;
    } else {
      console.log('  ⚠️  Patch 3: Streaming pattern not found (Regex mismatch).');
      // Debug helper
      // console.log('DEBUG Content snippet:', content.substring(content.indexOf('convertResponseContentToChatGenerationChunk'), content.indexOf('convertResponseContentToChatGenerationChunk') + 500));
    }
  } else {
    console.log('  ✅ Patch 3: Streaming chunks already patched');
    patchCount++;
  }

  if (patchCount > 0) {
    writeFileSync(targetFile, content, 'utf8');
    console.log(`\n✅ Successfully applied ${patchCount} patch(es) to @langchain/google-genai!`);
  } else {
    console.log('\n⚠️  No patches applied');
  }

} catch (error) {
  console.error('❌ Failed to patch @langchain/google-genai:', error.message);
  process.exit(1);
}
