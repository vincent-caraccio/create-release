'use strict';

const core = require('@actions/core');
const github = require('@actions/github');

(async function () {
  try {
    const token = core.getInput('token');
    const tag_name = core.getInput('tag_name');
    const name = core.getInput('release_name');
    const { owner, repo } = github.context.repo;
    const octokit = github.getOctokit(token);
    const { data } = await octokit.request('POST /repos/{owner}/{repo}/releases', { owner, repo, tag_name, name });
    exportDataToOutput(data);
  } catch (error) {
    core.setFailed(error.message);
  }
})().catch(error => core.setFailed(error.message));

function exportDataToOutput(data) {
  core.setOutput('id', data.id);
  core.setOutput('html_url', data.html_url);
  core.setOutput('upload_url', data.upload_url);
}
