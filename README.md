# Get version number

This action extracts the version of the latest release and increments it.
Result is stored in a environment variable named RELEASE_VERSION.

## Inputs

## `token`

**Required** The github token to query the list of artifacts.

## `repository`

**Required** The repository (format is usually my-organisation/my-repository).

## Example usage

```
- name: Create Release
  id: create_release
  uses: vincent-caraccio/create-release@v1.0.3
  with:
    token: ${{ secrets.GITHUB_TOKEN }} # No need to create it
    tag_name: ${{ env.RELEASE_VERSION }}
    release_name: Release ${{ env.RELEASE_VERSION }}
```
