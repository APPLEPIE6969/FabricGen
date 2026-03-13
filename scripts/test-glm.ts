import 'dotenv/config';
import OpenAI from 'openai';

async function test() {
  const client = new OpenAI({
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.NVIDIA_API_KEY
  });

  try {
    const completion = await client.chat.completions.create({
      model: 'z-ai/glm4.7',
      messages: [{ role: 'user', content: 'Return JSON with {"test": "value"}' }],
      response_format: { type: 'json_object' },
      max_tokens: 100,
    }, {
      extraBody: {
        chat_template_kwargs: {
          enable_thinking: true,
          clear_thinking: false
        }
      }
    });

    const msg = completion.choices[0].message;
    console.log("content:", msg.content);
    console.log("reasoning_content:", (msg as any).reasoning_content);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

test();
