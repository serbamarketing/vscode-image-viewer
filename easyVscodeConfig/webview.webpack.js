const path = require('path')

const webpackConfig = require('@easy_vscode/webview/webpack.webview').default

const entryApp = path.resolve(__dirname, '../src/webview/index.tsx')
webpackConfig.entry.app = [entryApp]

// Use local .babelrc (antd 5 uses CSS-in-JS, no babel-plugin-import for antd)
const jsRule = webpackConfig.module.rules.find((r) => r.test && r.test.toString().includes('tsx'))
if (jsRule && jsRule.use && jsRule.use.options) {
  jsRule.use.options.configFile = path.resolve(__dirname, '../.babelrc')
}

// Prefer project node_modules for antd 5 and its deps (avoid @easy_vscode/webview's antd 4)
webpackConfig.resolve.modules = [path.resolve(__dirname, '../node_modules'), 'node_modules']
// Force antd 5: @easy_vscode/webview App imports antd, resolve to our version
// antd/dist/antd.css: antd 5 uses CSS-in-JS, use placeholder
webpackConfig.resolve.alias = {
  ...webpackConfig.resolve.alias,
  'antd/dist/antd.css': path.resolve(__dirname, '../src/webview/antd-placeholder.css'),
  antd: path.resolve(__dirname, '../node_modules/antd')
}

exports.default = webpackConfig