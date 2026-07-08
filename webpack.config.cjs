const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProd ? 'production' : 'development',
  entry: path.resolve(__dirname, 'src', 'index.tsx'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProd ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
    assetModuleFilename: 'assets/[hash][ext][query]',
    publicPath: '/',
  },
  devtool: isProd ? 'source-map' : 'eval-source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      // SCSS/CSS
      {
        test: /\.s[ac]ss$/i,
        use: [
          isProd ? MiniCssExtractPlugin.loader : 'style-loader',
          {
            loader: 'css-loader',
            options: { sourceMap: !isProd, importLoaders: 2 },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: !isProd,
              postcssOptions: { plugins: ['postcss-preset-env'] },
            },
          },
          { loader: 'sass-loader', options: { sourceMap: !isProd } },
        ],
      },
      // Plain CSS
      {
        test: /\.css$/i,
        use: [
          isProd ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: { postcssOptions: { plugins: ['postcss-preset-env'] } },
          },
        ],
      },
      // Assets (images/fonts)
      {
        test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 8 * 1024 } },
      },
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public', 'index.html'),
      minify: (
        isProd
          ? {
              removeComments: true,
              collapseWhitespace: true,
              removeRedundantAttributes: true,
            }
          : false
      ),
    }),
    new MiniCssExtractPlugin({
      filename: isProd ? 'css/[name].[contenthash:8].css' : 'css/[name].css',
    }),
  ],
  devServer: {
    static: { directory: path.resolve(__dirname, 'public') },
    historyApiFallback: true,
    hot: true,
    open: true,
    port: 3000,
  },
  optimization: {
    splitChunks: { chunks: 'all' },
    runtimeChunk: 'single',
  },
};
