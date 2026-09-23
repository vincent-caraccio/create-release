'use strict';

const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

(async function () {
  try {
    const token = core.getInput('token');
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    checkInputs();
    // ORDER IS THE CONTRACT: a release is PUBLISHED only once its assets are attached and verified.
    // Publishing is what fires the `released` webhook monitor-service auto-deploys on, so a release
    // published before its file exists (the old create -> upload order) can be read with no asset.
    // So: create a DRAFT (no webhook, invisible to deploys), upload, verify, then publish.
    const release = await createDraftRelease(octokit, owner, repo);
    const uploaded = await uploadAsset(octokit, release.upload_url);
    await verifyAssets(octokit, owner, repo, release.id, uploaded);
    await publishRelease(octokit, owner, repo, release.id);
  } catch (error) {
    core.setFailed(error.message);
  }
})().catch(error => core.setFailed(error.message));

function checkInputs() {
  const safePath = getSafePath();
  if (safePath && fs.existsSync(safePath)) {
    const asset_content_type = core.getInput('asset_content_type');
    if (!asset_content_type) throw new Error('Asset Content Type is missing!');
  }
  const tag_name = core.getInput('tag_name');
  if (!tag_name) throw new Error('Tag name is missing!');
  const release_name = core.getInput('release_name');
  if (!release_name) throw new Error('Release name is missing!');
}

function getSafePath() {
  const asset_path = core.getInput('asset_path');
  if (!asset_path) return [];
  return asset_path
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => p.split('/'))
    .map(split => path.join(process.env.GITHUB_WORKSPACE, ...split));
}

async function uploadAsset(octokit, uploadUrl) {
  const safePaths = getSafePath();
  const exising = safePaths.filter(p => fs.existsSync(p));
  if (!exising.length) {
    console.log('No asset found to upload (not defined or file does not exist), will stop here.');
    return [];
  }

  return Promise.all(exising.map(async safePath => {
    const name = (exising.length === 1 && core.getInput('asset_name')) || path.basename(safePath);
    const assetContentType = core.getInput('asset_content_type');
  
    console.log(`Starting upload of asset ${name}`);
  
    await octokit.request({
      method: 'POST',
      url: uploadUrl,
      headers: { 'Content-Type': assetContentType },
      name,
      data: fs.readFileSync(safePath)
    });
  
    console.log(`Successfully uploaded ${name}`);
    return { name, size: fs.statSync(safePath).size };
  }));
}

// Reads the DRAFT's asset list back from GitHub and requires every uploaded file to be there, fully
// uploaded, at its local byte size. Throws otherwise — the release then stays an unpublished draft.
async function verifyAssets(octokit, owner, repo, release_id, expected) {
  if (!expected.length) return;
  const { data } = await octokit.request(
    'GET /repos/{owner}/{repo}/releases/{release_id}/assets',
    { owner, repo, release_id, per_page: 100 }
  );
  for (const { name, size } of expected) {
    const asset = data.find(a => a.name === name);
    if (!asset) throw new Error(`Asset ${name} is not attached to the release — not publishing.`);
    if (asset.state !== 'uploaded') throw new Error(`Asset ${name} is in state '${asset.state}', not 'uploaded' — not publishing.`);
    if (asset.size !== size) throw new Error(`Asset ${name} is ${asset.size} bytes on GitHub, ${size} locally — not publishing.`);
    console.log(`Verified asset ${name} (${size} bytes)`);
  }
}

async function publishRelease(octokit, owner, repo, release_id) {
  const { data } = await octokit.request(
    'PATCH /repos/{owner}/{repo}/releases/{release_id}',
    { owner, repo, release_id, draft: false }
  );
  console.log(`Published release ${data.name}: ${data.html_url} (${(data.assets || []).length} asset(s))`);
  core.setOutput('html_url', data.html_url);
}

async function createDraftRelease(octokit, owner, repo) {
  const tag_name = core.getInput('tag_name');
  const name = core.getInput('release_name');
  const generate_release_notes = true;
  const target_commitish = github.context.sha;
  const { data } = await octokit.request(
    'POST /repos/{owner}/{repo}/releases',
    { owner, repo, tag_name, name, generate_release_notes, target_commitish, draft: true }
  );
  console.log(`Created DRAFT release ${name} (id ${data.id})`);
  core.setOutput('upload_url', data.upload_url);
  core.setOutput('release_id', data.id);
  return data;
}
