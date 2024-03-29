# Create Release

This action creates a GitHub Release and associated Git tag. If defined, will upload and attach an asset to the release.

## Inputs

## `token`

**Required** The github token to query the list of artifacts.

## `tag_name`

**Required** The tag name

## `release_name`

**Required** The release name

## `asset_path / asset_name / asset_content_type`

**Optional** Asset information to upload to the release (path should be Unix style). If path is defined, `asset_content_type` will be mandatory.

## Example usage

```
- name: Create Release
  id: create_release
  uses: vincent-caraccio/create-release@v1.0.11
  with:
    token: ${{ secrets.GITHUB_TOKEN }} # No need to create it
    tag_name: ${{ env.RELEASE_VERSION }}
    release_name: Release ${{ env.RELEASE_VERSION }}
    asset_path: build/libs/${{ github.event.repository.name }}-${{ env.RELEASE_VERSION }}.jar
    asset_name:  ${{ github.event.repository.name }}-${{ env.RELEASE_VERSION }}.jar
    asset_content_type: application/java-archive
```
