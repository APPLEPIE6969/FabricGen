# FabricGen - Minecraft 1.21.11 Mod Generator

FabricGen is a modern web application that allows you to architect Minecraft Fabric mods for version 1.21.11 using AI. It generates Java source code, JSON models, and even pixel art textures iteratively.

## Features

- **Iterative AI Architect**: Refine your mod by chatting with an AI that understands the project state.
- **Multi-Model Support**: Uses a cascade of AI models from multiple providers (NVIDIA NIM, Groq, OpenRouter) for optimal results.
- **AI-Powered Texture Generation**: Generates pixel art textures using AI-written Python/PIL scripts.
- **Smart JSON Repair**: Automatically fixes common AI output issues (thinking tags, trailing commas, unquoted keys, etc.).
- **Cloud Build**: Compiles your mod to a `.jar` file using GitHub Actions.
- **Export ZIP**: Download the full source code including a pre-configured Gradle Wrapper.

## AI Models Used

### Main Generation (Mod Code)
The system tries models in order from smartest to fastest:
1. **moonshotai/kimi-k2.5** (1T MoE) - NVIDIA NIM
2. **z-ai/glm5** (744B MoE Thinking) - NVIDIA NIM
3. **mistral-large-3-675b** - NVIDIA NIM
4. **qwen3-coder-480b** - NVIDIA NIM
5. And more fallbacks...

### Texture Generation
Uses smarter models first for quality:
1. **moonshotai/kimi-k2.5** (1T MoE)
2. **z-ai/glm5** (744B MoE)
3. **mistral-large-3-675b**
4. Fast fallbacks for speed

## Smart JSON Repair

The system includes a robust JSON repair utility that handles common AI output issues:
- Removes thinking/reasoning tags (`<think>`, `<reasoning>`, etc.)
- Fixes trailing commas
- Converts single quotes to double quotes
- Quotes unquoted property names
- Removes JavaScript-style comments
- Escapes control characters
- Auto-closes unclosed brackets

## Environment Variables

To run this project, you need to set the following environment variables:

### Required
- `GROQ_API_KEY`: Your API key from [Groq](https://console.groq.com/).
- `NVIDIA_API_KEY`: Your API key from [NVIDIA NIM](https://build.nvidia.com/).
- `GH_TOKEN`: A GitHub Personal Access Token (PAT).
  - **Required Scopes**:
    - [x] **`workflow`**: (Update GitHub Action workflows)
    - [x] **`repo`**: (Full control of repositories)
- `GITHUB_REPO`: The full name of the repository (e.g., `username/repo-name`).

### Optional
- `GITHUB_BRANCH`: The branch name where the `.github/workflows/build-mod.yml` exists.
- `OPENROUTER_API_KEY`: Your API key from [OpenRouter](https://openrouter.ai/) for additional model access.
- `CEREBRAS_API_KEY`: Your API key from Cerebras for fast inference.

## Minecraft 1.21.11 Compatibility

The generated mods are specifically designed for Minecraft 1.21.11 with:
- **Fabric Loader 0.18.4**
- **Fabric API 0.141.3+1.21.11**
- **Java 21** (with modern features like records, pattern matching)
- **Gradle 9.2.1**
- **Official Mojang Mappings (Mojmap)**

### API Changes Documented
The AI is aware of critical 1.21+ API changes:
- `inventoryTick()` signature: `ServerWorld world` instead of `World world`
- `EquipmentSlot slot` instead of `int slot`
- `world.isClient()` is now a method

## Troubleshooting "No ref found"

If you see an error like `No ref found for: some-branch`:
1. Ensure the branch name in `GITHUB_BRANCH` matches exactly.
2. Ensure you have pushed the `.github/workflows/build-mod.yml` file to that specific branch on GitHub.
3. Ensure your `GH_TOKEN` has the required scopes.

## Local Development

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Create a `.env.local` file with the variables above.
4. Run the development server: `npm run dev`.

## Deployment

This app is ready to be deployed on [Vercel](https://vercel.com). Make sure to configure the environment variables in the Vercel project settings.

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Server-Sent Events)
- **AI**: OpenAI SDK compatible APIs (NVIDIA NIM, Groq, OpenRouter)
- **Build**: GitHub Actions, Gradle 9.2.1, Fabric Loom 1.15

## License

MIT
