# Image Viewer

View and manage images in your workspace: thumbnail grid, large preview, copy Base64 / path / file name, and per-project include/exclude folders.

**Requirements:** VS Code / Cursor **1.75+** (matches `engines.vscode` in `package.json`).

## Screenshots

### Main panel (grid & chrome)

![Image Viewer main panel — folder group preview in dark theme](https://public-img-1253867148.cos.ap-singapore.myqcloud.com/img-in-docs/dark%20theme%2C%20big%20pictures.png)

![Image Viewer main panel — image preview in dark theme](https://public-img-1253867148.cos.ap-singapore.myqcloud.com/img-in-docs/dark%20theme%2C%20big%20pictures%20-%20view.png)

![Image Viewer main panel — SVG with transparent background in light theme](https://public-img-1253867148.cos.ap-singapore.myqcloud.com/img-in-docs/light%20theme%EF%BC%8Csvg%20icons.png)

## Features

- Thumbnail grid with **lazy loading** and tuning for large libraries (many high-resolution images).
- **Column count** controls grid density (uses panel width efficiently).
- **Sort** images inside each folder (name, modified time, size, asc/desc).
- **Light / dark** UI for the panel; default follows your VS Code or Cursor theme (toggle in the toolbar).
- Preview backdrops: **checkerboard**, **transparent** (default), and solid swatches; useful for PNG/SVG with alpha.
- Image preview shows **file name** in the lightbox; zoom and navigate with keyboard.
- **Search** by path/name fragment; filter by **file type** via checkboxes.
- **Include / exclude** folders (per project, stored under `projectsConfig/` in the extension’s storage).
- **Copy** path, file name, or Base64 from the image menu.
- Open a folder from Explorer: **only that folder tree** is scanned (fast in huge repos). **Multiple** Image Viewer tabs for different folders; tab title includes the folder name.

## How to use

1. Open a folder or workspace in VS Code / Cursor.
2. **Whole workspace (default):** `Ctrl+Shift+P` / `⌘⇧P` → run **「View Images」** (command id: `vscode-infra.webviewImageViewer`).
3. **Folder only:** In the **Explorer**, right-click a **folder** (or an image file) → **View Images 🌄**. Only that directory (and subfolders) is indexed in that panel; the editor tab title reflects the folder.

## More documentation

- See **[CHANGELOG.md](./CHANGELOG.md)** for release notes
- Issues: [GitHub Issues](https://github.com/ZhangJian1713/vscode-image-viewer/issues)

## Questions or feedback

zhangjian1713@gmail.com
