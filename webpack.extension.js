//@ts-check

'use strict';

const path = require('path');
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')

/**@type {import('webpack').Configuration}*/
const configExtension = {
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  node: {
    __dirname: false,
    __filename: false
  },
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, './dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    // Drop stale artifacts (e.g. old `sql-wasm.wasm`) so `vsce package` never ships leftover files.
    clean: true
  },
  devtool: 'nosources-source-map',
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: 'node_modules/@jsquash/webp/codec/dec/webp_dec.wasm', to: 'wasm/webp_dec.wasm' }]
    })
  ],
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        // exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  }
};
module.exports = configExtension;