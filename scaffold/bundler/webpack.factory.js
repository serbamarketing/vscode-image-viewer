/**
 * Webpack config factory for Ant Design + Less + React webviews.
 * Copy this folder into your extension repo (or reference from monorepo) and adjust paths.
 *
 * @param {{
 *   context: string
 *   entry: string
 *   htmlTemplate: string
 *   favicon: string
 *   babelConfig: string
 *   forkTsReportGlob?: string
 * }} options
 */
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')

function createAntdLessWebviewWebpackConfig(options) {
  const {
    context,
    entry,
    htmlTemplate,
    favicon,
    babelConfig,
    forkTsReportGlob = 'src/**/*.{ts,tsx}'
  } = options

  return (env, argv) => {
    const isProductionMode = argv.mode === 'production'
    const cssUse = [MiniCssExtractPlugin.loader].concat('css-loader')
    const cssUseDebug = ['style-loader', 'css-loader']

    return {
      context,
      target: 'web',
      entry: {
        app: [entry]
      },
      output: {
        path: path.resolve(context, 'distWebview/'),
        publicPath: '/'
      },
      optimization: {
        chunkIds: 'named',
        minimizer: [
          new TerserPlugin({
            parallel: true
          })
        ]
      },
      module: {
        rules: [
          {
            test: /\.(j|t)sx?$/,
            exclude: (modulePath) =>
              /node_modules/.test(modulePath) && !/@easy_vscode[\\/]webview/.test(modulePath),
            use: {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true,
                babelrc: false,
                configFile: babelConfig
              }
            }
          },
          {
            test: /\.css$/,
            use: isProductionMode ? cssUse : cssUseDebug
          },
          {
            test: /\.less$/,
            use: [
              { loader: 'style-loader' },
              { loader: 'css-loader' },
              {
                loader: 'less-loader',
                options: {
                  lessOptions: {
                    modifyVars: {
                      'primary-color': '#2673DD',
                      'link-color': '#2673DD'
                    },
                    javascriptEnabled: true
                  }
                }
              }
            ]
          },
          {
            test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
            use: [
              {
                loader: 'babel-loader'
              },
              {
                loader: '@svgr/webpack',
                options: {
                  babel: false,
                  icon: true
                }
              }
            ]
          },
          {
            test: /\.(png|jpg|gif|woff2|svg)$/i,
            type: 'asset',
            parser: {
              dataUrlCondition: {
                maxSize: 10000
              }
            }
          }
        ]
      },
      resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        modules: [path.resolve(context, 'src'), 'node_modules']
      },
      plugins: [
        new CleanWebpackPlugin(),
        new ForkTsCheckerWebpackPlugin({
          reportFiles: [forkTsReportGlob]
        }),
        new HtmlWebpackPlugin({
          template: htmlTemplate,
          favicon,
          inject: true,
          minify: {
            html5: true,
            minifyCSS: false,
            minifyJS: false,
            removeComments: false,
            collapseWhitespace: false,
            preserveLineBreaks: true
          }
        }),
        ...(isProductionMode ? [] : [new webpack.HotModuleReplacementPlugin()]),
        new MiniCssExtractPlugin({
          filename: isProductionMode ? '[name].[hash].css' : '[name].css',
          chunkFilename: isProductionMode ? '[id].[hash].css' : '[id].css'
        })
      ],
      devServer: {
        historyApiFallback: {
          disableDotRule: true
        },
        hot: true,
        compress: true,
        port: 5000
      },
      devtool: isProductionMode ? false : 'source-map'
    }
  }
}

module.exports = { createAntdLessWebviewWebpackConfig }
