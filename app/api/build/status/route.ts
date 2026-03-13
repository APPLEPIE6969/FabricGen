import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const modId = searchParams.get('modId');

  if (!process.env.GH_TOKEN) {
    return NextResponse.json({ error: 'GH_TOKEN is not set' }, { status: 500 });
  }

  const repoFull = process.env.GITHUB_REPO || 'diddy62626/Minecraft-Fabric-1.21.11-Mod-Generator';
  const [owner, repo] = repoFull.split('/');

  const octokit = new Octokit({ auth: process.env.GH_TOKEN });

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/actions/runs', {
      owner,
      repo,
      per_page: 10
    });

    const run = response.data.workflow_runs.find(r => r.name === 'Build Minecraft Mod' || r.path.endsWith('build-mod.yml'));

    if (!run) {
      return NextResponse.json({ status: 'not_found' });
    }

    let downloadUrl = null;
    if (run.status === 'completed' && run.conclusion === 'success') {
      const artifacts = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts', {
        owner,
        repo,
        run_id: run.id
      });
      const artifact = artifacts.data.artifacts.find(a => a.name === `${modId}-built`);
      if (artifact) {
         downloadUrl = `https://github.com/${owner}/${repo}/actions/runs/${run.id}`;
      }
    }

    return NextResponse.json({
      status: run.status,
      conclusion: run.conclusion,
      runId: run.id,
      htmlUrl: run.html_url,
      downloadUrl
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
