# scaffold（脚手架 / 按说明维护）

这里的文件表示 **「按 easy-vscode 流程生成或可整目录替换」** 的部分，与 **`src/` 里以业务为主的手写代码** 区分。

| 路径 | 含义 |
|------|------|
| `webview.webpack.js` | Webpack CLI 入口（`yarn ui-build` 指向此文件）。可由 `yarn vendor:template` 或 `init-webview-template` 重写。 |
| `bundler/` | 从 `easy-vscode/webview-templates/*` **复制**而来的工厂 + 静态壳（`webpack.factory.js`、`src/index.html` 等）。**不要用业务逻辑填满这里**；要换模板时整目录覆盖即可。 |

扩展根目录仍只有 **一个** `package.json`（依赖全部装在那里）。非交互 / CI 下默认模板由同文件中的 **`webviewVendorTemplate`** 字段指定（本扩展为 `antd-less`）。
