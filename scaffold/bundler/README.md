# antd-less webview template

Use this when your webview uses **Ant Design + Less + React**.

## What lives here (frontend app layer)

| Item | Role |
|------|------|
| `webpack.factory.js` | Full webpack setup (babel, less, svg, devServer). **Own and edit** in your project. |
| `src/index.html` | Webview HTML shell with `$currentView$` / `$vscodeEnv$` placeholders. |
| `src/global.antd.css` | Optional global Ant Design tweaks; copy to your `src/webview/antd-global.css`. |
| `AntdWebviewShell.sample.tsx` | Root with `ConfigProvider`; copy into your extension, adjust imports. |

## What stays in `@easy_vscode/webview` (runtime only)

- `registerWebview(components, { Root?: ... })`
- `callVscode`
- Message typing used by `callVscode`

No webpack, no Ant Design, no i18n inside the npm runtime surface.

## Monorepo wiring

新项目：`scaffold/webview.webpack.js` + `scaffold/bundler/`（vendor）。仍使用 `easyVscodeConfig/` 的仓库见 `vscode-image-viewer`。

## npm / standalone repo

Copy this entire folder into your extension repository and commit it. You can then swap React version, replace Less with Sass, or switch bundler without touching `@easy_vscode/webview`.

## No `package.json` here — install in your extension root

This folder is **not** an npm package. **`index.html` + `webpack.factory.js` do not pull in React or Ant Design**; those must be in **your extension** `package.json`.

### `dependencies` (typical)

- `react`, `react-dom`
- `antd`, `@ant-design/icons` (versions you choose)
- `@easy_vscode/webview`

### `devDependencies` (typical — match factory rules)

Everything listed for **minimal-react**, plus:

- `less`, `less-loader`
- `@svgr/webpack` (for `.svg` rule in factory)

Optional: `babel-plugin-import` for older Ant Design tree-shaking patterns (Ant Design 5 often uses ES modules without it).

Reference: `vscode-image-viewer/package.json` and `easy-vscode/packages/demo/package.json`.
