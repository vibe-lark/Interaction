const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const Module = require('module');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ESBuildMinifyPlugin } = require('esbuild-loader');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackBar = require('webpackbar');
const webpack = require('webpack');

function tryAddGlobalOpdevCliNodeModulesToNodePath() {
  let prefix = '';
  try {
    prefix = execSync('npm prefix -g', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch (e) {}
  if (!prefix) return;

  const candidates = [
    path.join(prefix, 'lib', 'node_modules', '@lark-opdev', 'cli', 'node_modules'),
    path.join(prefix, 'node_modules', '@lark-opdev', 'cli', 'node_modules'),
  ].filter((p) => fs.existsSync(p));

  if (candidates.length === 0) return;

  const sep = process.platform === 'win32' ? ';' : ':';
  const existing = (process.env.NODE_PATH || '').split(sep).filter(Boolean);
  for (const p of candidates) {
    if (!existing.includes(p)) existing.push(p);
  }
  process.env.NODE_PATH = existing.join(sep);
  Module._initPaths();
}

tryAddGlobalOpdevCliNodeModulesToNodePath();

const appJsonPath = path.resolve(process.cwd(), 'app.json');
const appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
const appJson = JSON.parse(appJsonContent);
let docsAddonDevMiddleware = async () => (req, res, next) => next();
let docsAddonWebpackPlugin = class {
  apply() {}
};
try {
  const utils = require('@lark-opdev/block-docs-addon-webpack-utils');
  docsAddonDevMiddleware = utils.docsAddonDevMiddleware;
  docsAddonWebpackPlugin = utils.docsAddonWebpackPlugin;
} catch (e) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[docs-addon] block-docs-addon-webpack-utils load failed, fallback to noop plugin');
  }
  docsAddonWebpackPlugin = class {
    constructor() {}
    apply(compiler) {
      if (process.env.NODE_ENV !== 'production') return;
      compiler.hooks.compilation.tap('DocsAddonFallbackWebpackPlugin', (compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: 'DocsAddonFallbackWebpackPlugin',
            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
          },
          () => {
            const projectInfo = {
              appid: appJson.appID,
              projectname: appJson.projectName,
              blocks: ['index'],
            };
            const initialHeight = appJson.initialHeight ?? appJson?.contributes?.addPanel?.initialHeight;
            const blockInfo = {
              blockTypeID: appJson.blockTypeID,
              blockRenderType: 'offlineWeb',
              offlineWebConfig: {
                initialHeight,
                contributes: appJson.contributes,
              },
            };
            compilation.emitAsset('project.config.json', new webpack.sources.RawSource(JSON.stringify(projectInfo)));
            compilation.emitAsset('index.json', new webpack.sources.RawSource(JSON.stringify(blockInfo)));
          }
        );
      });
    }
  };
}

const cwd = process.cwd();
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const config = {
  entry: './src/index.tsx',
  devtool: isProduction ? false : 'inline-source-map',
  mode: isDevelopment ? 'development' : 'production',
  stats: 'errors-only',
  output: {
    path: path.resolve(__dirname, './dist'),
    clean: true,
    publicPath: isDevelopment ? '/block/' : './',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [/node_modules\/@lark-open/],
        use: ['source-map-loader'],
        enforce: 'pre',
      },
      {
        oneOf: [
          {
            test: /\.[jt]sx?$/,
            include: [path.join(cwd, 'src')],
            exclude: /node_modules/,
            use: [
              {
                loader: require.resolve('esbuild-loader'),
                options: {
                  loader: 'tsx',
                  target: 'es2015',
                },
              },
            ],
          },
          {
            test: /\.css$/,
            use: [
              isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
              'css-loader',
            ],
          },
          {
            test: /\.less$/,
            use: [
              isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
              'css-loader',
              'less-loader',
            ],
          },
          {
            test: /\.(png|jpg|jpeg|gif|ico|svg)$/,
            type: 'asset/resource',
            generator: {
              filename: 'assets/[name][ext][query]',
            },
          },
        ],
      },
    ],
  },
  plugins: [
    ...(isDevelopment
      ? [new ReactRefreshWebpackPlugin(), new WebpackBar()]
      : [new MiniCssExtractPlugin()]),
    new docsAddonWebpackPlugin({
      url: appJson.url
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/index.html',
      publicPath: isDevelopment ? '/block/' : './',
    }),
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  optimization: {
    minimize: isProduction,
    minimizer: [new ESBuildMinifyPlugin({ target: 'es2015', css: true })],
    moduleIds: 'deterministic',
    runtimeChunk: true,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          name: 'vendor',
          test: /[\\/]node_modules[\\/]/,
          chunks: 'all',
        },
      },
    },
  },
  devServer: isProduction
    ? undefined
    : {
        headers: {
          'Access-Control-Allow-Private-Network': true
        },
        hot: true,
        client: {
          logging: 'error',
        },
        setupMiddlewares: (middlewares, devServer) => {
          if (!devServer || !devServer.app) {
            throw new Error('webpack-dev-server is not defined');
          }
          docsAddonDevMiddleware(devServer).then((middleware) => {
            devServer.app.use(middleware);
          });
          return middlewares;
        },
      },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
};
module.exports = config;
