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
    await uploadAsset(octokit, owner, repo, uploadUrl);
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
  if (!asset_path) return undefined;
  const split = asset_path.split('/');
  const safePath = path.join(process.env.GITHUB_WORKSPACE, ...split);
  return safePath;
}

async function uploadAsset(octokit, uploadUrl) {
  const safePath = getSafePath();
  if (!safePath || !fs.existsSync(safePath)) return;

  const name = core.getInput('asset_name') || path.basename(safePath);
  const assetContentType = core.getInput('asset_content_type');

  await octokit.request({
    method: 'POST',
    url: uploadUrl,
    headers: { 'Content-Type': assetContentType },
    name,
    data: fs.readFileSync(safePath)
  });
}

async function createRelease(octokit, owner, repo) {
  const tag_name = core.getInput('tag_name');
  const name = core.getInput('release_name');
  const generate_release_notes = true;
  const { data } = await octokit.request(
    'POST /repos/{owner}/{repo}/releases',
    { owner, repo, tag_name, name, generate_release_notes }
  );
  return data.upload_url;
}
