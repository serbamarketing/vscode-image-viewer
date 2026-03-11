const path = require('path')

const webpackConfig = require('@easy_vscode/webview/webpack.webview').default

const entryApp = path.resolve(__dirname, '../src/webview/index.tsx')
webpackConfig.entry.app = [entryApp]

// Use local .babelrc (antd 5 uses CSS-in-JS, no babel-plugin-import for antd)
const jsRule = webpackConfig.module.rules.find((r) => r.test && r.test.toString().includes('tsx'))
if (jsRule && jsRule.use && jsRule.use.options) {
  jsRule.use.options.configFile = path.resolve(__dirname, '../.babelrc')
}

exports.default = webpackConfig