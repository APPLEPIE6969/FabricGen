import OpenAI from 'openai';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { parseJsonWithRepair, validateModResponse } from '@/utils/json-repair';

export const maxDuration = 180; // Allow up to 3 minutes for generation

// ── Unified Model Ranking ───────────────────────────────────────────────
type ProviderKey = 'groq' | 'nvidia' | 'cerebras' | 'openrouter';

interface RankedModel {
  provider: ProviderKey;
  model: string;
  params: string;
}

const PROVIDER_CONFIG: Record<ProviderKey, { baseURL: string; apiKeyEnv: string }> = {
  groq: { baseURL: 'https://api.groq.com/openai/v1', apiKeyEnv: 'GROQ_API_KEY' },
  nvidia: { baseURL: 'https://integrate.api.nvidia.com/v1', apiKeyEnv: 'NVIDIA_API_KEY' },
  cerebras: { baseURL: 'https://api.cerebras.ai/v1', apiKeyEnv: 'CEREBRAS_API_KEY' },
  openrouter: { baseURL: 'https://openrouter.ai/api/v1', apiKeyEnv: 'OPENROUTER_API_KEY' },
};

const MODELS: RankedModel[] = [
  { provider: 'nvidia', model: 'moonshotai/kimi-k2.5', params: '1T MoE' },
  { provider: 'nvidia', model: 'z-ai/glm5', params: '744B MoE (Thinking)' },
  { provider: 'nvidia', model: 'mistralai/mistral-large-3-675b-instruct-2512', params: '675B' },
  { provider: 'nvidia', model: 'qwen/qwen3-coder-480b-a35b-instruct', params: '480B MoE (code)' },
  { provider: 'nvidia', model: 'qwen/qwen3.5-397b-a17b', params: '400B MoE' },
  { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', params: '253B' },
  { provider: 'nvidia', model: 'minimaxai/minimax-m2.5', params: '230B' },
  { provider: 'nvidia', model: 'mistralai/devstral-2-123b-instruct-2512', params: '123B (code)' },
  { provider: 'groq', model: 'openai/gpt-oss-120b', params: '120B (Groq)' },
  { provider: 'nvidia', model: 'nvidia/nemotron-3-super-120b-a12b', params: '120B MoE (Hybrid/Agentic)' },
  { provider: 'nvidia', model: 'qwen/qwen3-next-80b-a3b-instruct', params: '80B MoE' },
  { provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct', params: '70B' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile', params: '70B (Groq)' },
  { provider: 'nvidia', model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', params: '49B' },
  { provider: 'nvidia', model: 'z-ai/glm4.7', params: '~40B (Thinking)' },
  { provider: 'groq', model: 'qwen/qwen3-32b', params: '32B' },
  { provider: 'nvidia', model: 'qwen/qwen2.5-coder-32b-instruct', params: '32B (code)' },
  { provider: 'nvidia', model: 'nvidia/nemotron-3-nano-30b-a3b', params: '30B MoE' },
  { provider: 'openrouter', model: 'nvidia/nemotron-3-nano-30b-a3b:free', params: '30B MoE (free)' },
  { provider: 'nvidia', model: 'google/gemma-3-27b-it', params: '27B' },
  { provider: 'nvidia', model: 'mistralai/mistral-small-24b-instruct', params: '24B' },
  { provider: 'groq', model: 'openai/gpt-oss-20b', params: '20B' },
  { provider: 'nvidia', model: 'moonshotai/kimi-k2-instruct', params: 'MoE (NV)' },
  { provider: 'nvidia', model: 'moonshotai/kimi-k2-instruct-0905', params: '~20B MoE (NV)' },
  { provider: 'nvidia', model: 'moonshotai/kimi-k2-thinking', params: 'Thinking (NV)' },
  { provider: 'groq', model: 'meta-llama/llama-4-scout-17b-16e-instruct', params: '17B MoE' },
  { provider: 'openrouter', model: 'google/gemma-3-12b-it:free', params: '12B (free)' },
  { provider: 'nvidia', model: 'nvidia/nvidia-nemotron-nano-9b-v2', params: '9B' },
  { provider: 'openrouter', model: 'nvidia/nemotron-nano-9b-v2:free', params: '9B (free)' },
  { provider: 'groq', model: 'llama-3.1-8b-instant', params: '8B (Groq)' },
  { provider: 'nvidia', model: 'meta/llama-3.1-8b-instruct', params: '8B (NV)' },
];

// Smart models used specifically for texture script generation (smarter first, fast as fallback)
const TEXTURE_MODELS: RankedModel[] = [
  { provider: 'nvidia', model: 'moonshotai/kimi-k2.5', params: '1T MoE' },
  { provider: 'nvidia', model: 'z-ai/glm5', params: '744B MoE (Thinking)' },
  { provider: 'nvidia', model: 'mistralai/mistral-large-3-675b-instruct-2512', params: '675B' },
  { provider: 'nvidia', model: 'qwen/qwen3-coder-480b-a35b-instruct', params: '480B MoE (code)' },
  { provider: 'nvidia', model: 'qwen/qwen3.5-397b-a17b', params: '400B MoE' },
  { provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct', params: '70B' },
  { provider: 'nvidia', model: 'nvidia/nemotron-3-super-120b-a12b', params: '120B MoE (Hybrid/Agentic)' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile', params: '70B (Groq)' },
  { provider: 'nvidia', model: 'qwen/qwen2.5-coder-32b-instruct', params: '32B (code)' },
  { provider: 'groq', model: 'qwen/qwen3-32b', params: '32B' },
  { provider: 'nvidia', model: 'moonshotai/kimi-k2-instruct', params: 'MoE (NV)' },
  { provider: 'nvidia', model: 'moonshotai/kimi-k2-instruct-0905', params: 'MoE (NV)' },
  { provider: 'nvidia', model: 'moonshotai/kimi-k2-thinking', params: 'Thinking (NV)' },
  { provider: 'groq', model: 'llama-3.1-8b-instant', params: '8B (Groq)' },
];

// ── AI-Powered Texture Generator ────────────────────────────────────────
// Uses an AI model to generate a Python/PIL script, then executes it to
// produce high-quality Minecraft pixel art textures. No external API needed.
async function generatePixelArt(
  prompt: string,
  size: number,
  clients: Partial<Record<ProviderKey, OpenAI>>,
  send?: (type: string, payload: any) => void,
  preferredProvider: string = 'auto'
): Promise<string | null> {

  const textureSystemPrompt = `You are a Minecraft pixel art texture artist AI.
Your job is to write a COMPLETE, RUNNABLE Python script that generates a Minecraft-style pixel art texture.

CRITICAL RULES:
1. Use ONLY the PIL/Pillow library (from PIL import Image, ImageDraw).
2. The image MUST be exactly ${size}x${size} pixels.
3. Draw pixel-by-pixel or use rectangles. Think about shading, highlights, edge details, and color variation like real Minecraft textures.
4. Use realistic Minecraft-style color palettes — NOT flat single colors. Add subtle color variation per-pixel for depth.
5. At the end, the script MUST:
   a. Save the image to a BytesIO buffer as PNG
   b. Print ONLY the raw base64 string to stdout (no newlines, no prefix, no "data:image" — just the base64 string)
6. Do NOT use any external files, URLs, or downloads.
7. Do NOT print anything else to stdout (no debug prints, no messages).
8. The script must be 100% self-contained — if I paste it into a .py file and run it, it must work.

EXAMPLE STRUCTURE:
\`\`\`python
from PIL import Image, ImageDraw
import base64
from io import BytesIO
import random

img = Image.new('RGBA', (${size}, ${size}), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# ... draw your pixel art here ...

buf = BytesIO()
img.save(buf, format='PNG')
print(base64.b64encode(buf.getvalue()).decode('utf-8'), end='')
\`\`\`

RESPOND WITH ONLY THE PYTHON CODE. No markdown, no explanation, no backticks. Just the raw Python script.`;

  const prioritizedTextureModels = preferredProvider === 'auto' 
    ? TEXTURE_MODELS 
    : [
        ...TEXTURE_MODELS.filter(m => m.provider === preferredProvider),
        ...TEXTURE_MODELS.filter(m => m.provider !== preferredProvider)
      ];

  for (const { provider, model, params } of prioritizedTextureModels) {
    const client = clients[provider];
    if (!client) continue;

    try {
      send?.('texture_ai', { provider: provider.toUpperCase(), model: model.split('/').pop(), params });
      console.log(`[TEXTURE AI] Trying ${provider}/${model} for script generation...`);

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 120000);

      const completion = await client.chat.completions.create({
        messages: [
          { role: 'system', content: textureSystemPrompt },
          { role: 'user', content: `Generate a ${size}x${size} Minecraft pixel art texture of: ${prompt}` },
        ],
        model: model,
        temperature: 0.7,
      }, {
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      let script = completion.choices[0]?.message?.content || '';
      if (!script.trim()) continue;

      // Strip markdown code fences if the model wraps them
      script = script
        .replace(/^```(?:python)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

      // Strip any <think>...</think> reasoning blocks
      script = script.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      // If there's still non-Python text before the imports, extract just the code
      const importMatch = script.match(/((?:from |import )[\s\S]*)/);
      if (importMatch) {
        script = importMatch[1];
      }

      console.log(`[TEXTURE AI] Got script from ${model} (${script.length} chars). Executing...`);
      send?.('texture_exec', { length: script.length });

      // Write to temp file and execute
      const tempId = randomBytes(8).toString('hex');
      const tempDir = join(tmpdir(), 'fabricgen-textures');
      mkdirSync(tempDir, { recursive: true });
      const scriptPath = join(tempDir, `texture_${tempId}.py`);

      try {
        writeFileSync(scriptPath, script, 'utf-8');

        const output = execSync(`python "${scriptPath}"`, {
          timeout: 15000,
          maxBuffer: 10 * 1024 * 1024, // 10MB for large base64
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // Clean up
        try { unlinkSync(scriptPath); } catch { }

        const base64Result = output.trim();

        // Validate it's actual base64 and looks like a PNG
        if (base64Result.length > 50 && /^[A-Za-z0-9+/=]+$/.test(base64Result)) {
          console.log(`[TEXTURE AI] ✓ Successfully generated ${size}x${size} texture (${base64Result.length} chars base64)`);
          return base64Result;
        } else {
          console.error(`[TEXTURE AI] Output doesn't look like valid base64 (${base64Result.length} chars)`);
          continue;
        }
      } catch (execError: any) {
        try { unlinkSync(scriptPath); } catch { }
        console.error(`[TEXTURE AI] Script execution failed:`, execError.stderr || execError.message);
        send?.('texture_exec_fail', { error: (execError.stderr || execError.message || '').slice(0, 200) });
        continue;
      }
    } catch (error: any) {
      const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
      console.error(`[TEXTURE AI] ${model} failed:`, isTimeout ? 'Timed out' : error.message);
      continue;
    }
  }

  console.error('[TEXTURE AI] All texture models failed, returning fallback');
  return null;
}

// ── SSE helper ──────────────────────────────────────────────────────────
function sseEvent(type: string, payload: any): string {
  return `data: ${JSON.stringify({ type, payload })}\n\n`;
}

// ── Main Generation Endpoint (Streaming SSE) ────────────────────────────
export async function POST(req: Request) {
  const { prompt, modId, modName, mavenGroup, currentFiles, baseTemplates, preferredProvider = 'auto' } = await req.json();

  const systemPrompt = `You are the ultimate Universe-Class Minecraft Fabric 1.21.11 Mod Architect.
Your goal is to design and implement mods that feel like part of the Vanilla game, but with modern engineering excellence.

## Project Specifications
- **Mod Name**: ${modName}
- **Mod ID**: ${modId}
- **Package**: ${mavenGroup}.${modId}
- **Minecraft Version**: \`1.21.11\` (CRITICAL: This is version **1.21.11**, NOT 1.21.1. Do NOT use 1.21.1 anywhere!)
- **Mappings**: STRICTLY Official Mojang Mappings (Mojmap)
- **JDK Compliance**: Java 21 (Use Multi-line strings, Pattern Matching for instanceof, and Records)

## Architecture & Logic Excellence

### 1. MODULAR REGISTRIES
Always organize your registrations (Items, Blocks, Entities) into dedicated \`ModItems\`, \`ModBlocks\`, etc. classes.

### 2. VANILLA FEEL
Ensure all item and block properties (blast resistance, hardness, tool requirements) are realistic and consistent with Minecraft.

### 3. DETAILED TEXTURE PROMPTS
- For ANY texture (.png), set \`encoding\` to \`"texture_prompt"\`
- Your \`"content"\` MUST be a HIGH-FIDELITY visual description
- Focus on: Material, Lighting, Shading, and Palette
- Set \`"texture_size"\` to: \`16\` (items), \`32\` (detailed blocks), or \`64\` (complex textures)

### 4. COMPLETE RESOURCES
Every block/item MUST have:
- A blockstate/model JSON
- An entry in the \`en_us.json\` lang file
- A texture prompt

## CRITICAL MINECRAFT 1.21.11 API CHANGES

\`\`\`java
// OLD (1.20 and earlier):
public void inventoryTick(ItemStack stack, World world, Entity entity, int slot, int selected)

// NEW (1.21.11):
@Override
public void inventoryTick(ItemStack stack, ServerWorld world, Entity entity, EquipmentSlot slot, int selected)
\`\`\`

- Use \`ServerWorld\` instead of \`World\`
- Use \`EquipmentSlot\` instead of \`int slot\`
- \`world.isClient()\` is now a method (not a field)
- ServerWorld is always server-side, so skip isClient checks

## CRITICAL VERSION REQUIREMENTS

All generated files MUST use these exact versions:

| File | Requirement |
|------|-------------|
| \`fabric.mod.json\` | \`"minecraft": "~1.21.11"\` |
| \`build.gradle\` | \`minecraft "com.mojang:minecraft:1.21.11"\` |
| Mappings | \`loom.officialMojangMappings()\` |
| fabric-api | \`"0.141.3+1.21.11"\` |

## Response Format

You MUST respond with a JSON object wrapped in markdown code blocks:

\`\`\`json
{
  "upsert": [
    {
      "path": "src/main/java/...",
      "content": "...",
      "encoding": "utf-8"
    }
  ],
  "delete": []
}
\`\`\`

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| \`upsert\` | array | Files to create/update |
| \`upsert[].path\` | string | File path relative to project root |
| \`upsert[].content\` | string | File content (Java code, JSON, or texture prompt) |
| \`upsert[].encoding\` | string | \`"utf-8"\` or \`"texture_prompt"\` |
| \`upsert[].texture_size\` | number | 16, 32, or 64 (only for texture_prompt) |
| \`delete\` | array | File paths to delete |

## FINAL RULES

1. **VERSION**: Use \`1.21.11\` EVERYWHERE, NEVER \`1.21.1\`
2. **FORMAT**: Start with \`\`\`\`json and end with \`\`\`\`
3. **NO EXTRA TEXT**: Output ONLY the JSON code block, no explanations before or after`;

  // Build OpenAI clients for each provider
  const clients: Partial<Record<ProviderKey, OpenAI>> = {};
  for (const [key, config] of Object.entries(PROVIDER_CONFIG)) {
    const apiKey = process.env[config.apiKeyEnv];
    if (apiKey) {
      clients[key as ProviderKey] = new OpenAI({ apiKey, baseURL: config.baseURL });
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, payload: any) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(type, payload)));
        } catch {
          // Stream may have been closed by the client
        }
      };

      let lastError: any = null;
      let succeeded = false;
      let accumulatedContent = '';

      // Reorder models based on user preference
      const prioritizedModels = preferredProvider === 'auto' 
        ? MODELS 
        : [
            ...MODELS.filter(m => m.provider === preferredProvider),
            ...MODELS.filter(m => m.provider !== preferredProvider)
          ];

      // Try each model in unified best-to-worst order
      for (const { provider, model, params } of prioritizedModels) {
        const client = clients[provider];
        if (!client) continue;

        send('model_try', { provider: provider.toUpperCase(), model, params });
        console.log(`[${provider.toUpperCase()}] Trying ${model} (${params})...`);

        try {
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 300000);

          // ── Stream the completion ──────────────────────────────────────
          const streamResponse = await client.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
              ...(accumulatedContent ? [
                { role: 'assistant', content: accumulatedContent },
                { role: 'user', content: "CRITICAL: The previous model stalled. CONTINUE EXACTLY from the last character above. Do not repeat anything. Finish the JSON structure." }
              ] : [])
            ] as any,
            model: model,
            stream: true,
          }, {
            signal: abortController.signal,
            ...(provider === 'nvidia' && model.startsWith('z-ai/glm') ? {
              extraBody: {
                chat_template_kwargs: {
                  enable_thinking: true,
                  clear_thinking: false
                }
              }
            } : {})
          });

          const modelStartTime = Date.now();
          let thinkingBuffer = '';
          let lastFlush = Date.now();

          // ── Stuck-AI Watchdog (3-minute monitor) ───────────────────────
          let lastCheckLength = accumulatedContent.length;
          let unchangedCount = 0;
          const watchdogInterval = setInterval(() => {
            if (accumulatedContent.length === lastCheckLength) {
              unchangedCount++;
              console.warn(`[WATCHDOG] Progress stalled for ${unchangedCount} minute(s) on ${model}`);
              if (unchangedCount >= 3) {
                console.error(`[WATCHDOG] Stalled for 3 minutes! Aborting ${model}...`);
                abortController.abort();
              }
            } else {
              lastCheckLength = accumulatedContent.length;
              unchangedCount = 0;
            }
          }, 60000);

          try {
            for await (const chunk of streamResponse) {
              const delta = chunk.choices?.[0]?.delta;
              if (!delta) continue;

              const reasoningContent = (delta as any).reasoning_content || '';
              const textContent = delta.content || '';
              const combined = reasoningContent + textContent;

              if (combined) {
                accumulatedContent += combined;
                thinkingBuffer += combined;

                const now = Date.now();
                if (now - lastFlush > 80 || thinkingBuffer.length > 60) {
                  send('thinking', { text: thinkingBuffer });
                  thinkingBuffer = '';
                  lastFlush = now;
                }
              }
            }
          } finally {
            clearInterval(watchdogInterval);
          }

          if (thinkingBuffer) {
            send('thinking', { text: thinkingBuffer });
          }

          clearTimeout(timeoutId);

          if (!accumulatedContent || accumulatedContent.trim() === '') {
            throw new Error('Empty response from model');
          }

          // ── Pre-Extraction Prep: Remove thinking tags ────────────────
          // We keep the original for debugging but clean it for parsing
          const cleanResponse = accumulatedContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

          send('json_repair', { strategy: 'extract_blocks' });
          const { data: responseData, repairs, success } = parseJsonWithRepair(cleanResponse);

          if (!success) {
            throw new Error('Failed to parse JSON after all repair attempts');
          }

          if (repairs.length > 0) {
            console.log('✓ JSON repairs applied:', repairs.join('; '));
            send('json_repair', { repairs });
          }

          // Validate response schema
          const validation = validateModResponse(responseData);
          if (!validation.valid) {
            console.warn('⚠ Response schema validation warnings:', validation.errors);
            send('schema_warnings', { warnings: validation.errors });
          }

          send('model_success', { provider: provider.toUpperCase(), model, params });
          console.log(`✓ Success with [${provider.toUpperCase()}] ${model} (${params})`);

          // ── AI-Powered Texture Generation ──────────────────────────────
          const responseObj = responseData as { upsert?: any[]; delete?: string[] };
          if (responseObj.upsert) {
            const textureFiles = responseObj.upsert.filter((file: any) => file.encoding === 'texture_prompt');

            if (textureFiles.length > 0) {
              send('textures_start', { count: textureFiles.length });

              // Generate textures sequentially to avoid overloading
              for (const file of textureFiles) {
                const size = [8, 16, 32, 64].includes(file.texture_size) ? file.texture_size : 32;
                send('texture', { path: file.path, prompt: file.content, size });
                console.log(`[TEXTURE] Generating ${size}x${size} for ${file.path}: "${file.content}"`);

                const base64 = await generatePixelArt(file.content, size, clients, send, preferredProvider);
                if (base64) {
                  file.content = base64;
                  file.encoding = 'base64';
                } else {
                  // Fallback: tiny transparent PNG
                  file.content = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4xNkRpr/UAAABKSURBVFhH7c0xAQAgDASx8G/6My4YOLSD7M+cc3+PdTgD1uEMWIczYB3OgHU4A9bhDFiHM2AdzoBvf8O37bIOZ8A6nAHrcAbO3BcOlFWxAXuzVgAAAABJRU5ErkJggg==";
                  file.encoding = 'base64';
                }
                delete file.texture_size;
                send('texture_done', { path: file.path, size });
              }
            }
          }

          // Send the final result
          send('result', responseObj);
          succeeded = true;
          break;
        } catch (error: any) {
          const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
          const reason = isTimeout ? 'Timed out after 3m' : (error.message || 'Unknown error');
          console.error(`✗ Failed [${provider.toUpperCase()}] ${model}:`, reason);
          send('model_fail', { provider: provider.toUpperCase(), model, reason });
          lastError = error;
          continue;
        }
      }

      if (!succeeded) {
        send('error', { message: 'All models failed across all providers', details: lastError?.message });
      }

      send('done', {});
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
