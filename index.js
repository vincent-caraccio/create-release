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
    const uploadUrl = await createRelease(octokit, owner, repo);
    await uploadAsset(octokit, uploadUrl);
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
    return;
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
  }));
}

async function createRelease(octokit, owner, repo) {
  const tag_name = core.getInput('tag_name');
  const name = core.getInput('release_name');
  const generate_release_notes = true;
  const target_commitish = github.context.sha;
  const { data } = await octokit.request(
    'POST /repos/{owner}/{repo}/releases',
    { owner, repo, tag_name, name, generate_release_notes, target_commitish }
  );
  console.log(`Successfully created release ${name}: ${data.html_url}`);
  core.setOutput('upload_url', data.upload_url);
  core.setOutput('html_url', data.html_url);
  core.setOutput('release_id', data.id);
  return data.upload_url;
}
