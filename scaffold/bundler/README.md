# antd-less webview template

Use this template for webviews built with **Ant Design + Less + React**.

## What is included (frontend app layer)

| Item | Role |
|------|------|
| `webpack.factory.js` | Full webpack setup (babel, less, svg, devServer). Adjust in your project as needed. |
| `src/index.html` | Webview HTML shell with `$currentView$` / `$vscodeEnv$` placeholders. |
| `src/global.antd.css` | Optional global Ant Design tweaks; copy into your `src/webview/antd-global.css`. |
| `AntdWebviewShell.sample.tsx` | Root `ConfigProvider` shell sample. Copy into extension source and adjust imports. |

## What remains in `@easy_vscode/webview` (runtime-only)

- `registerWebview(components, { Root?: ... })`
- `callVscode`
- Message types used by `callVscode`

No webpack, Ant Design, or i18n build concerns are part of runtime surface.

## Monorepo wiring

Recommended new structure: `scaffold/webview.webpack.js` + vendored `scaffold/bundler/`.
Legacy repos may still use `easyVscodeConfig/` (for example, older snapshots of `vscode-image-viewer`).

## npm / standalone repo usage

Copy this folder into your extension repository and commit it.
You can then change React version, replace Less with Sass, or switch bundler without changing `@easy_vscode/webview` runtime API.

## No `package.json` in this folder

This directory is **not** an npm package.
`index.html` + `webpack.factory.js` do not install React/Ant Design; those belong in extension root `package.json`.

### Typical `dependencies`

- `react`, `react-dom`
- `antd`, `@ant-design/icons` (choose versions you need)
- `@easy_vscode/webview`

### Typical `devDependencies`

Everything from **minimal-react**, plus:

- `less`, `less-loader`
- `@svgr/webpack` (for `.svg` rule in factory)

Optional: `babel-plugin-import` for older Ant Design tree-shaking workflows.

Reference: `vscode-image-viewer/package.json` and `easy-vscode/packages/demo/package.json`.
