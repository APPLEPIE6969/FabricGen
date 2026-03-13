import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// ── Provider Configuration ──────────────────────────────────────────────
// Each provider has its own base URL, API key, and ranked model list.
// Models are tried in order; if one fails (rate limit, overload, etc.)
// it falls through to the next. After exhausting a provider, the next
// provider is attempted.

interface Provider {
  name: string;
  baseURL: string;
  apiKeyEnv: string;
  models: string[];
}

const PROVIDERS: Provider[] = [
  {
    name: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    models: [
      // Tier 1 — Production flagships (best quality)
      'openai/gpt-oss-120b',       // 120B params, 500 t/s, 65K max output
      'openai/gpt-oss-20b',        // 20B params, 1000 t/s, 65K max output

      // Tier 2 — Strong preview models
      'qwen/qwen3-32b',            // 32B params, 400 t/s, 40K max output
      'moonshotai/kimi-k2-instruct-0905', // 200 t/s, 262K context

      // Tier 3 — Production workhorses
      'llama-3.3-70b-versatile',   // 70B params, 280 t/s, 32K max output

      // Tier 4 — Lightweight fallbacks
      'meta-llama/llama-4-scout-17b-16e-instruct', // 750 t/s
      'llama-3.1-8b-instant',      // 8B params, fastest fallback
    ],
  },
  {
    name: 'NVIDIA',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKeyEnv: 'NVIDIA_API_KEY',
    models: [
      // Tier 1 — Code-specialist flagships
      'qwen/qwen3-coder-480b-a35b-instruct',       // 480B MoE, purpose-built for code
      'mistralai/devstral-2-123b-instruct-2512',    // 123B, state-of-art code model

      // Tier 2 — Large reasoning models
      'deepseek-ai/deepseek-v3.2',                  // 685B reasoning LLM
      'mistralai/mistral-large-3-675b-instruct-2512', // 675B general purpose

      // Tier 3 — Strong mid-tier
      'nvidia/llama-3.1-nemotron-ultra-253b-v1',    // 253B, superior reasoning
      'qwen/qwen3.5-122b-a10b',                     // 122B MoE
      'z-ai/glm-4.7',                               // Strong coding & tool use

      // Tier 4 — Lightweight fallbacks
      'google/gemma-3-27b-it',                       // 27B, fast
      'meta/llama-3.1-8b-instruct',                  // 8B, last resort
    ],
  },
];

async function generatePixelArt(prompt: string) {
  const apiKey = process.env.PIXELLAB_API_KEY;
  if (!apiKey) {
    console.error('PIXELLAB_API_KEY is not set');
    return null;
  }

  try {
    const response = await fetch('https://api.pixellab.ai/v1/generate-image-pixflux', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: prompt,
        image_size: { width: 16, height: 16 },
        no_background: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pixel Lab API error:', errorText);
      return null;
    }

    const data = await response.json();
    return data.image.base64;
  } catch (error) {
    console.error('Failed to call Pixel Lab:', error);
    return null;
  }
}

export async function POST(req: Request) {
  const { prompt, modId, modName, mavenGroup, currentFiles, baseTemplates } = await req.json();

  const systemPrompt = `You are a world-class Minecraft Fabric 1.21.11 Mod Architect.
Your goal is to manage the source code and resources for a mod project iteratively.

Project Info:
- Name: ${modName}
- ID: ${modId}
- Package: ${mavenGroup}.${modId}

Project State:
- Base Files (ReadOnly Templates):
${JSON.stringify(baseTemplates, null, 2)}

- Current Generated Files:
${JSON.stringify(currentFiles || [], null, 2)}

Instructions:
1. Analyze the user request and current project state.
2. Determine which files need to be ADDED, MODIFIED, or REMOVED.
3. You generate Java code, JSON models, lang files, etc.
4. TEXTURE GENERATION (16x16 pixels):
   - For ANY texture file (.png), DO NOT generate base64 content.
   - Instead, set "content" to a highly descriptive prompt for the texture (e.g., "a shiny purple amethyst gemstone pixel art, isolated").
   - Set "encoding" to "texture_prompt".
   - Note: The system will automatically generate a 16x16 PNG based on this prompt.
5. Your response MUST be a JSON object with 'upsert' and 'delete' arrays.

Response Schema:
{
  "upsert": [
    {
      "path": "string",
      "content": "string",
      "encoding": "utf-8" | "texture_prompt"
    }
  ],
  "delete": ["string"]
}

Rules:
- Resource paths: src/main/resources/assets/${modId}/...
- Java paths: src/main/java/${mavenGroup.replace(/\./g, '/')}/${modId}/...
- Always provide FULL content for modified files.
- DO NOT explain. Only return the JSON.`;

  let lastError = null;

  // Try each provider in order
  for (const provider of PROVIDERS) {
    const apiKey = process.env[provider.apiKeyEnv];
    if (!apiKey) {
      console.warn(`${provider.name}: ${provider.apiKeyEnv} not set, skipping`);
      continue;
    }

    const client = new OpenAI({
      apiKey,
      baseURL: provider.baseURL,
    });

    // Try each model within this provider
    for (const model of provider.models) {
      try {
        console.log(`Trying ${provider.name} → ${model}...`);
        const completion = await client.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          model: model,
          response_format: { type: 'json_object' },
        });

        const responseData = JSON.parse(completion.choices[0].message.content || '{"upsert": [], "delete": []}');

        // Generate pixel art textures if needed
        if (responseData.upsert) {
          for (const file of responseData.upsert) {
            if (file.encoding === 'texture_prompt') {
              console.log(`Generating 16x16 texture for ${file.path} with prompt: ${file.content}`);
              const base64 = await generatePixelArt(file.content);
              if (base64) {
                file.content = base64;
                file.encoding = 'base64';
              } else {
                file.content = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVR42mP8z8BQz0AEYBxVMBiYAAAhS6Pz79rv9AAAAABJRU5ErkJggg==";
                file.encoding = 'base64';
              }
            }
          }
        }

        console.log(`✓ Success with ${provider.name} → ${model}`);
        return NextResponse.json(responseData);
      } catch (error: any) {
        console.error(`✗ Failed ${provider.name} → ${model}:`, error.message || error);
        lastError = error;
        continue;
      }
    }
  }

  return NextResponse.json({ error: 'All providers and models failed', details: lastError?.message }, { status: 500 });
}
