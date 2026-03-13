import 'dotenv/config';
import OpenAI from 'openai';

type ProviderKey = 'groq' | 'nvidia' | 'cerebras' | 'openrouter';

interface RankedModel {
  provider: ProviderKey;
  model: string;
  params: string;
}

const PROVIDER_CONFIG: Record<ProviderKey, { baseURL: string; apiKeyEnv: string }> = {
  groq:       { baseURL: 'https://api.groq.com/openai/v1',       apiKeyEnv: 'GROQ_API_KEY' },
  nvidia:     { baseURL: 'https://integrate.api.nvidia.com/v1',   apiKeyEnv: 'NVIDIA_API_KEY' },
  cerebras:   { baseURL: 'https://api.cerebras.ai/v1',            apiKeyEnv: 'CEREBRAS_API_KEY' },
  openrouter: { baseURL: 'https://openrouter.ai/api/v1',          apiKeyEnv: 'OPENROUTER_API_KEY' },
};

const MODELS: RankedModel[] = [
  // ── 1000B+ ────────────────────────────────────────────────────────────
  { provider: 'nvidia', model: 'moonshotai/kimi-k2.5',                         params: '1T MoE' },

  // ── 600B–999B ─────────────────────────────────────────────────────────
  { provider: 'nvidia', model: 'z-ai/glm-5',                                   params: '744B MoE' },
  { provider: 'nvidia', model: 'deepseek-ai/deepseek-v3.2',                    params: '685B' },
  { provider: 'nvidia', model: 'mistralai/mistral-large-3-675b-instruct-2512', params: '675B' },

  // ── 400B–599B ─────────────────────────────────────────────────────────
  { provider: 'nvidia',     model: 'qwen/qwen3-coder-480b-a35b-instruct',         params: '480B MoE (code)' },
  { provider: 'openrouter', model: 'qwen/qwen3-coder-480b-a35b:free',              params: '480B MoE (free)' },
  { provider: 'openrouter', model: 'nousresearch/hermes-3-405b-instruct:free',     params: '405B (free)' },
  { provider: 'nvidia',     model: 'qwen/qwen3.5-397b-a17b',                       params: '400B MoE' },

  // ── 300B–399B ─────────────────────────────────────────────────────────
  { provider: 'cerebras', model: 'zai-glm-4.7',                                  params: '355B (~1000 t/s)' },

  // ── 200B–299B ─────────────────────────────────────────────────────────
  { provider: 'nvidia',   model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',      params: '253B' },
  { provider: 'cerebras', model: 'qwen-3-235b-a22b-instruct-2507',               params: '235B (~1400 t/s)' },
  { provider: 'nvidia',   model: 'minimaxai/minimax-m2.5',                        params: '230B' },

  // ── 100B–199B ─────────────────────────────────────────────────────────
  { provider: 'nvidia',   model: 'mistralai/devstral-2-123b-instruct-2512',      params: '123B (code)' },
  { provider: 'nvidia',   model: 'qwen/qwen3.5-122b-a10b',                       params: '122B MoE' },
  { provider: 'cerebras', model: 'gpt-oss-120b',                                  params: '120B (~3000 t/s)' },
  { provider: 'groq',     model: 'openai/gpt-oss-120b',                           params: '120B (Groq)' },
  { provider: 'nvidia',   model: 'nvidia/nemotron-3-super-120b-a12b',            params: '120B MoE' },

  // ── 50B–99B ───────────────────────────────────────────────────────────
  { provider: 'nvidia',     model: 'qwen/qwen3-next-80b-a3b-instruct',            params: '80B MoE' },
  { provider: 'openrouter', model: 'qwen/qwen3-next-80b-a3b-instruct:free',       params: '80B MoE (free)' },
  { provider: 'nvidia',     model: 'meta/llama-3.3-70b-instruct',                  params: '70B' },
  { provider: 'groq',       model: 'llama-3.3-70b-versatile',                      params: '70B (Groq)' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free',       params: '70B (free)' },
  { provider: 'nvidia',     model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',    params: '49B' },

  // ── 30B–49B ───────────────────────────────────────────────────────────
  { provider: 'nvidia',     model: 'z-ai/glm-4.7',                                 params: '~40B' },
  { provider: 'openrouter', model: 'z-ai/glm-4.5-air:free',                        params: '~40B (free)' },
  { provider: 'groq',       model: 'qwen/qwen3-32b',                               params: '32B' },
  { provider: 'nvidia',     model: 'qwen/qwen2.5-coder-32b-instruct',             params: '32B (code)' },
  { provider: 'nvidia',     model: 'nvidia/nemotron-3-nano-30b-a3b',              params: '30B MoE' },
  { provider: 'openrouter', model: 'nvidia/nemotron-3-nano-30b-a3b:free',          params: '30B MoE (free)' },

  // ── 20B–29B ───────────────────────────────────────────────────────────
  { provider: 'nvidia',     model: 'google/gemma-3-27b-it',                        params: '27B' },
  { provider: 'openrouter', model: 'google/gemma-3-27b-it:free',                   params: '27B (free)' },
  { provider: 'nvidia',     model: 'mistralai/mistral-small-24b-instruct',        params: '24B' },
  { provider: 'openrouter', model: 'mistralai/mistral-small-3.1-24b-instruct:free', params: '24B (free)' },
  { provider: 'groq',       model: 'openai/gpt-oss-20b',                           params: '20B' },
  { provider: 'openrouter', model: 'openai/gpt-oss-20b:free',                      params: '20B (free)' },
  { provider: 'groq',       model: 'moonshotai/kimi-k2-instruct-0905',             params: '~20B MoE' },
  { provider: 'nvidia',     model: 'moonshotai/kimi-k2-instruct-0905',            params: '~20B MoE (NV)' },

  // ── <20B (lightweight fallbacks) ──────────────────────────────────────
  { provider: 'groq',       model: 'meta-llama/llama-4-scout-17b-16e-instruct',    params: '17B MoE' },
  { provider: 'openrouter', model: 'google/gemma-3-12b-it:free',                   params: '12B (free)' },
  { provider: 'nvidia',     model: 'nvidia/nvidia-nemotron-nano-9b-v2',           params: '9B' },
  { provider: 'openrouter', model: 'nvidia/nemotron-nano-9b-v2:free',              params: '9B (free)' },
  { provider: 'cerebras',   model: 'llama3.1-8b',                                  params: '8B (~2200 t/s)' },
  { provider: 'groq',       model: 'llama-3.1-8b-instant',                         params: '8B (Groq)' },
  { provider: 'nvidia',     model: 'meta/llama-3.1-8b-instruct',                  params: '8B (NV)' },
  { provider: 'openrouter', model: 'qwen/qwen3-4b:free',                           params: '4B (free)' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.2-3b-instruct:free',        params: '3B (free)' },
];

async function testModels() {
  console.log('Testing all models with NO TIME LIMIT...');
  console.log('--------------------------------------------------\\n');

  const clients: Partial<Record<ProviderKey, OpenAI>> = {};
  for (const [key, config] of Object.entries(PROVIDER_CONFIG)) {
    const apiKey = process.env[config.apiKeyEnv];
    if (apiKey) {
      clients[key as ProviderKey] = new OpenAI({ apiKey, baseURL: config.baseURL });
    } else {
      console.warn(`[WARNING] Missing API key for ${key.toUpperCase()}`);
    }
  }

  const results: any[] = [];

  for (const { provider, model, params } of MODELS) {
    const client = clients[provider];
    if (!client) {
      console.log(`[SKIP] [${provider.toUpperCase()}] ${model} - Missing API Key`);
      results.push({ provider, model, status: 'SKIPPED', msg: 'Missing API Key' });
      continue;
    }

    console.log(`[TESTING] [${provider.toUpperCase()}] ${model} (${params})...`);
    const startTime = Date.now();

    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 60000);

      const completion = await client.chat.completions.create({
        messages: [{ role: 'user', content: 'Reply exactly with "SUCCESS". Do not include any other text.' }],
        model: model,
        max_tokens: 10,
      }, { signal: abortController.signal });

      clearTimeout(timeoutId);

      const responseTimeMs = Date.now() - startTime;
      const responseTimeSec = (responseTimeMs / 1000).toFixed(2);
      const answer = completion.choices[0]?.message?.content?.trim() || '';

      console.log(`[  OK  ] -> Answered in ${responseTimeSec}s: "${answer}"`);
      results.push({ provider, model, status: 'OK', time: responseTimeSec, answer });
    } catch (error: any) {
      const responseTimeMs = Date.now() - startTime;
      const responseTimeSec = (responseTimeMs / 1000).toFixed(2);
      
      const errorMsg = error.message || String(error);
      let shortError = errorMsg;
      if (errorMsg.includes('404')) shortError = '404 Not Found';
      if (errorMsg.includes('400')) shortError = '400 Bad Request/Invalid Model';
      if (errorMsg.includes('402')) shortError = '402 Payment Required / Out of Credits';
      if (errorMsg.includes('401')) shortError = '401 Unauthorized';
      if (errorMsg.includes('timeout') || errorMsg.includes('ECONNRESET')) shortError = 'Timeout / Connection Reset';

      console.log(`[ FAIL ] -> Failed in ${responseTimeSec}s: ${shortError}`);
      results.push({ provider, model, status: 'FAIL', time: responseTimeSec, error: shortError });
    }
    console.log('---');
  }

  console.log('\\n================= SUMMARY =================');
  const working = results.filter(r => r.status === 'OK');
  const failed = results.filter(r => r.status === 'FAIL');
  const skipped = results.filter(r => r.status === 'SKIPPED');

  console.log(`✅ Working: ${working.length}`);
  console.log(`❌ Failed:  ${failed.length}`);
  console.log(`⏭️ Skipped: ${skipped.length}`);
  console.log('');
  console.log('FASTEST WORKING MODELS:');
  working.sort((a, b) => parseFloat(a.time) - parseFloat(b.time)).slice(0, 10).forEach(w => {
    console.log(`- [${w.provider.toUpperCase()}] ${w.model}: ${w.time}s`);
  });
}

testModels();
