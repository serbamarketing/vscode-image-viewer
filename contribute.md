## Development & Publishing Guide for Image Viewer SE

### 1. Debug and Develop
```bash
yarn
```
Press `F5` in VS Code / Cursor to debug the extension in an Extension Development Host window.

### 2. Package & Publish to Open VSX
```bash
# Package VSIX file
npx @vscode/vsce package

# Publish to Open VSX
npx ovsx publish image-viewer-se-1.1.3.vsix -t <YOUR_OPEN_VSX_TOKEN>
```
