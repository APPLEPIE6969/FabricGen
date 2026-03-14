import OpenAI from 'openai';

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
  { provider: 'nvidia', model: 'nvidia/nemotron-3-super-120b-a12b', params: '120B MoE' },
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
  { provider: 'groq', model: 'moonshotai/kimi-k2-instruct-0905', params: '~20B MoE' },
  { provider: 'nvidia', model: 'moonshotai/kimi-k2-instruct-0905', params: '~20B MoE (NV)' },
  { provider: 'groq', model: 'meta-llama/llama-4-scout-17b-16e-instruct', params: '17B MoE' },
  { provider: 'openrouter', model: 'google/gemma-3-12b-it:free', params: '12B (free)' },
  { provider: 'nvidia', model: 'nvidia/nvidia-nemotron-nano-9b-v2', params: '9B' },
  { provider: 'openrouter', model: 'nvidia/nemotron-nano-9b-v2:free', params: '9B (free)' },
  { provider: 'groq', model: 'llama-3.1-8b-instant', params: '8B (Groq)' },
  { provider: 'nvidia', model: 'meta/llama-3.1-8b-instruct', params: '8B (NV)' },
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
        image_size: { width: 32, height: 32 },
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

// ── SSE helper ──────────────────────────────────────────────────────────
function sseEvent(type: string, payload: any): string {
  return `data: ${JSON.stringify({ type, payload })}\n\n`;
}

// ── Main Generation Endpoint (Streaming SSE) ────────────────────────────
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
4. TEXTURE GENERATION (32x32 pixels):
   - For ANY texture file (.png), DO NOT generate base64 content.
   - Instead, set "content" to a highly descriptive prompt for the texture (e.g., "a shiny purple amethyst gemstone pixel art, isolated").
   - Set "encoding" to "texture_prompt".
   - Note: The system will automatically generate a 32x32 PNG based on this prompt.
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

      // Try each model in unified best-to-worst order
      for (const { provider, model, params } of MODELS) {
        const client = clients[provider];
        if (!client) continue;

        send('model_try', { provider: provider.toUpperCase(), model, params });
        console.log(`[${provider.toUpperCase()}] Trying ${model} (${params})...`);

        try {
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 30000);

          // ── Stream the completion ──────────────────────────────────────
          const streamResponse = await client.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
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

          let fullContent = '';
          let thinkingBuffer = '';
          let lastFlush = Date.now();

          for await (const chunk of streamResponse) {
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) continue;

            // Some models put reasoning in a separate field
            const reasoningContent = (delta as any).reasoning_content || '';
            const textContent = delta.content || '';
            const combined = reasoningContent + textContent;

            if (combined) {
              fullContent += combined;
              thinkingBuffer += combined;

              // Flush thinking text every 80ms to avoid overwhelming the client
              const now = Date.now();
              if (now - lastFlush > 80 || thinkingBuffer.length > 60) {
                send('thinking', { text: thinkingBuffer });
                thinkingBuffer = '';
                lastFlush = now;
              }
            }
          }

          // Flush any remaining thinking buffer
          if (thinkingBuffer) {
            send('thinking', { text: thinkingBuffer });
          }

          clearTimeout(timeoutId);

          if (!fullContent || fullContent.trim() === '') {
            throw new Error('Empty response from model');
          }

          // Parse the JSON response
          let responseData;
          try {
            responseData = JSON.parse(fullContent);
          } catch {
            const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              responseData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('Response was not valid JSON');
            }
          }

          send('model_success', { provider: provider.toUpperCase(), model, params });
          console.log(`✓ Success with [${provider.toUpperCase()}] ${model} (${params})`);

          // ── Parallel Pixel Art Generation ───────────────────────────────
          if (responseData.upsert) {
            const textureFiles = responseData.upsert.filter((file: any) => file.encoding === 'texture_prompt');
            
            if (textureFiles.length > 0) {
              send('textures_start', { count: textureFiles.length });

              const texturePromises = textureFiles.map(async (file: any) => {
                send('texture', { path: file.path, prompt: file.content });
                console.log(`Generating 32x32 texture for ${file.path} with prompt: ${file.content}`);
                
                const base64 = await generatePixelArt(file.content);
                if (base64) {
                  file.content = base64;
                  file.encoding = 'base64';
                } else {
                  file.content = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVR42mP8z8BQz0AEYBxVMBiYAAAhS6Pz79rv9AAAAABJRU5ErkJggg==";
                  file.encoding = 'base64';
                }
                send('texture_done', { path: file.path });
              });

              await Promise.all(texturePromises);
            }
          }

          // Send the final result
          send('result', responseData);
          succeeded = true;
          break;
        } catch (error: any) {
          const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
          const reason = isTimeout ? 'Timed out after 30s' : (error.message || 'Unknown error');
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
