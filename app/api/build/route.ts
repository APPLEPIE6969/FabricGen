import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';
import { FABRIC_TEMPLATES } from '@/utils/templates';

export async function POST(req: Request) {
  const { modFiles, modId } = await req.json();

  if (!process.env.GH_TOKEN) {
    return NextResponse.json({ error: 'GH_TOKEN is not set' }, { status: 500 });
  }

  const repoFull = process.env.GITHUB_REPO || 'diddy62626/Minecraft-Fabric-1.21.11-Mod-Generator';
  const [owner, repo] = repoFull.split('/');
  
  const ref = process.env.GITHUB_BRANCH || 'main';

  // OPTIMIZATION: We no longer send binary Gradle Wrapper files (gradlew, jar) 
  // because they exceed GitHub's 64KB input limit.
  // The GitHub Action will now generate them automatically if missing.
  const fullModFiles = [
    ...modFiles,
    { path: 'gradle/wrapper/gradle-wrapper.properties', content: FABRIC_TEMPLATES.gradleWrapperProperties }
  ];

  const octokit = new Octokit({ auth: process.env.GH_TOKEN });

  try {
    await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
      owner,
      repo,
      workflow_id: 'build-mod.yml',
      ref,
      inputs: {
        mod_files_json: JSON.stringify(fullModFiles),
        mod_id: modId
      },
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return NextResponse.json({ success: true, owner, repo, ref });
  } catch (error: any) {
    console.error('GitHub Action trigger failed:', error);
    
    // Fallback logic for branch detection
    if (error.message.includes('No ref found') && process.env.VERCEL_GIT_COMMIT_REF && ref !== process.env.VERCEL_GIT_COMMIT_REF) {
       try {
          const fallbackRef = process.env.VERCEL_GIT_COMMIT_REF;
          await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
            owner,
            repo,
            workflow_id: 'build-mod.yml',
            ref: fallbackRef,
            inputs: {
              mod_files_json: JSON.stringify(fullModFiles),
              mod_id: modId
            },
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          });
          return NextResponse.json({ success: true, owner, repo, ref: fallbackRef, notice: 'Used fallback Vercel ref' });
       } catch (fallbackError: any) {
          return NextResponse.json({ 
            error: `Build failed: ${fallbackError.message}`, 
            attemptedRef: process.env.VERCEL_GIT_COMMIT_REF
          }, { status: 500 });
       }
    }

    return NextResponse.json({ 
      error: `Build failed: ${error.message}`, 
      attemptedRef: ref
    }, { status: 500 });
  }
}
