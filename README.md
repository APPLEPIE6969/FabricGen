# FabricGen - Minecraft 1.21.11 Mod Generator

FabricGen is a modern web application that allows you to architect Minecraft Fabric mods for version 1.21.11 using AI. It generates Java source code, JSON models, and even 16x16 pixel art textures iteratively.

## Features
- **Iterative AI Architect**: Refine your mod by chatting with an AI that understands the project state.
- **Pixel Art Generation**: Automatically generates 16x16 PNG textures via Pixel Lab.
- **Cloud Build**: Compiles your mod to a `.jar` file using GitHub Actions.
- **Export ZIP**: Download the full source code including a pre-configured Gradle Wrapper.

## Environment Variables

To run this project, you need to set the following environment variables:

- `GROQ_API_KEY`: Your API key from [Groq](https://console.groq.com/).
- `PIXELLAB_API_KEY`: Your API key from [Pixel Lab](https://pixellab.ai/).
- `GH_TOKEN`: A GitHub Personal Access Token (PAT).
  - **Required Scopes**: 
    - [x] **`workflow`**: (Update GitHub Action workflows)
    - [x] **`repo`**: (Full control of repositories)
- `GITHUB_REPO`: The full name of the repository (e.g., `username/repo-name`).
- `GITHUB_BRANCH`: (Optional) The branch name where the `.github/workflows/build-mod.yml` exists. 
  - **Note**: On Vercel, this is automatically detected. Only set this if you want to override it or are running locally.

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
