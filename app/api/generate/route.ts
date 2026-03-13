import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// ── Unified Model Ranking ───────────────────────────────────────────────
// Models from ALL providers in a single list, ranked best → worst.
// Each entry specifies which provider to use. If a model fails (rate
// limit, overload, missing key), it silently falls through to the next.

type ProviderKey = 'groq' | 'nvidia';

interface RankedModel {
  provider: ProviderKey;
  model: string;
  params: string; // human-readable size for logging
}

const PROVIDER_CONFIG: Record<ProviderKey, { baseURL: string; apiKeyEnv: string }> = {
  groq:   { baseURL: 'https://api.groq.com/openai/v1',       apiKeyEnv: 'GROQ_API_KEY' },
  nvidia: { baseURL: 'https://integrate.api.nvidia.com/v1',   apiKeyEnv: 'NVIDIA_API_KEY' },
};

// Single unified list: best → worst across all providers
const MODELS: RankedModel[] = [
  // ── 1000B+ ────────────────────────────────────────────────────────────
  { provider: 'nvidia', model: 'moonshotai/kimi-k2.5',                         params: '1T MoE' },

  // ── 600B–999B ─────────────────────────────────────────────────────────
  { provider: 'nvidia', model: 'z-ai/glm-5',                                   params: '744B MoE' },
  { provider: 'nvidia', model: 'deepseek-ai/deepseek-v3.2',                    params: '685B' },
  { provider: 'nvidia', model: 'mistralai/mistral-large-3-675b-instruct-2512', params: '675B' },

  // ── 400B–599B ─────────────────────────────────────────────────────────
  { provider: 'nvidia', model: 'qwen/qwen3-coder-480b-a35b-instruct',         params: '480B MoE (code)' },
  { provider: 'nvidia', model: 'qwen/qwen3.5-397b-a17b',                       params: '400B MoE' },

  // ── 200B–399B ─────────────────────────────────────────────────────────
  { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',      params: '253B' },
  { provider: 'nvidia', model: 'minimaxai/minimax-m2.5',                        params: '230B' },

  // ── 100B–199B ─────────────────────────────────────────────────────────
  { provider: 'nvidia', model: 'mistralai/devstral-2-123b-instruct-2512',      params: '123B (code)' },
  { provider: 'nvidia', model: 'qwen/qwen3.5-122b-a10b',                       params: '122B MoE' },
  { provider: 'groq',  model: 'openai/gpt-oss-120b',                           params: '120B' },
  { provider: 'nvidia', model: 'nvidia/nemotron-3-super-120b-a12b',            params: '120B MoE' },

  // ── 50B–99B ───────────────────────────────────────────────────────────
  { provider: 'nvidia', model: 'qwen/qwen3-next-80b-a3b-instruct',            params: '80B MoE' },
  { provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct',                  params: '70B' },
  { provider: 'groq',  model: 'llama-3.3-70b-versatile',                       params: '70B (Groq)' },
  { provider: 'nvidia', model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',    params: '49B' },

  // ── 30B–49B ───────────────────────────────────────────────────────────
  { provider: 'nvidia', model: 'z-ai/glm-4.7',                                 params: '~40B' },
  { provider: 'groq',  model: 'qwen/qwen3-32b',                                params: '32B' },
  { provider: 'nvidia', model: 'qwen/qwen2.5-coder-32b-instruct',             params: '32B (code)' },
  { provider: 'nvidia', model: 'nvidia/nemotron-3-nano-30b-a3b',              params: '30B MoE' },

  // ── 20B–29B ───────────────────────────────────────────────────────────
  { provider: 'nvidia', model: 'google/gemma-3-27b-it',                        params: '27B' },
  { provider: 'nvidia', model: 'mistralai/mistral-small-24b-instruct',        params: '24B' },
  { provider: 'groq',  model: 'openai/gpt-oss-20b',                            params: '20B' },
  { provider: 'groq',  model: 'moonshotai/kimi-k2-instruct-0905',             params: '~20B MoE' },
  { provider: 'nvidia', model: 'moonshotai/kimi-k2-instruct-0905',            params: '~20B MoE (NV)' },

  // ── <20B (lightweight fallbacks) ──────────────────────────────────────
  { provider: 'groq',  model: 'meta-llama/llama-4-scout-17b-16e-instruct',    params: '17B MoE' },
  { provider: 'nvidia', model: 'nvidia/nvidia-nemotron-nano-9b-v2',           params: '9B' },
  { provider: 'groq',  model: 'llama-3.1-8b-instant',                          params: '8B (Groq)' },
  { provider: 'nvidia', model: 'meta/llama-3.1-8b-instruct',                  params: '8B (NV)' },
];

// ── Pixel Art Generator ─────────────────────────────────────────────────
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

// ── Main Generation Endpoint ────────────────────────────────────────────
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

  // Build OpenAI clients for each provider (cached per request)
  const clients: Partial<Record<ProviderKey, OpenAI>> = {};
  for (const [key, config] of Object.entries(PROVIDER_CONFIG)) {
    const apiKey = process.env[config.apiKeyEnv];
    if (apiKey) {
      clients[key as ProviderKey] = new OpenAI({ apiKey, baseURL: config.baseURL });
    }
  }

  let lastError = null;

  // Try each model in unified best-to-worst order
  for (const { provider, model, params } of MODELS) {
    const client = clients[provider];
    if (!client) {
      continue; // API key not set for this provider
    }

    try {
      console.log(`[${provider.toUpperCase()}] Trying ${model} (${params})...`);
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

      console.log(`✓ Success with [${provider.toUpperCase()}] ${model} (${params})`);
      return NextResponse.json(responseData);
    } catch (error: any) {
      console.error(`✗ Failed [${provider.toUpperCase()}] ${model}:`, error.message || error);
      lastError = error;
      continue;
    }
  }

  return NextResponse.json({ error: 'All models failed across all providers', details: lastError?.message }, { status: 500 });
}
