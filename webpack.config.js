const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  // Default to development mode, (production flag will trigger production
  // mode when build command is executed)
  mode: 'development',

  // Main entry file
  entry: './src/index.jsx',

  // Main output file
  output: {
    filename: 'bundle.js',

    // Place the output file in the public folder
    path: `${__dirname}/public`
  },

  // Module Options
  module: {
    rules: [
      // Use babel-loader to transpile all the javascript files not in node_modules
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          query: {
            presets: ['@babel/preset-react', '@babel/preset-env']
          }
        }
      },

      // Enable Modular CSS
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                // Generate unique classnames for modular classnames
                localIdentName: '[name]__[local]___[hash:base64:5]'
              }
            }
          }
        ]
      },

      // In CSS modules, enable the use of webp and jpg image files for
      // background images, and eot, ttf, woff, and svg files for icomoon icons
      {
        test: /\.(webp|jpg|eot|ttf|woff|svg)$/,
        use: 'file-loader'
      }
    ]
  },

  // Check for js and jsx files when there is no extension provided for a filename
  resolve: {
    extensions: ['.js', '.jsx']
  },

  // Optimize files
  optimization: {
    minimizer: [
      // Minify and uglify all bundle files
      new TerserPlugin(),

      // Minify HTML, and minify CSS in style elements and style attributes
      new HtmlWebpackPlugin({
        template: 'index.html',
        inject: false, // Do not inject a script tag for the bundle

        // HTML minification options
        minify: {
          collapseWhitespace: true,
          minifyCSS: true,
          removeAttributeQuotes: true,
          removeComments: true
        }
      })
    ]
  },

  // Additional Plugins
  plugins: [
    // Generate an asset manifest
    new ManifestPlugin({
      fileName: 'asset-manifest.json'
    }),

    // Generate a service worker file
    new SWPrecacheWebpackPlugin({
      filename: 'service-worker.js',

      // If a URL is already hashed by Webpack, then there is no concern
      // about the cache being stale, so skip the cache-busting.
      dontCacheBustUrlsMatching: /\.\w{8}\./,

      // Minify and uglify the service worker file
      minify: true,

      // 404s fallback to the main index.html file
      navigateFallback: './index.html',

      // Cache all assets except the asset-manifest file and the robots.txt file
      staticFileGlobsIgnorePatterns: [/asset-manifest\.json$/, /robots\.txt$/]
    }),

    // Copy necessary files and directories to the public folder upon production build
    new CopyWebpackPlugin([
      'index.html',
      'manifest.json',
      'robots.txt',
      { from: 'src/style/bootstrap.min.css', to: 'src/style' },
      { from: 'src/style/style.css', to: 'src/style' },
      { from: 'images', to: 'images' },
      { from: 'fonts', to: 'fonts' }
    ]),

    // Create an interactive treemap visualization of the contents of all the
    // bundles (for size analysis)
    new BundleAnalyzerPlugin({
      // Currently disable this plugin to optimize load speed during
      // development (enable when needed)
      analyzerMode: 'disabled',

      // Do not automatically open the analyzer in a seperate browser window
      openAnalyzer: false
    })
  ],

  // 404s fallback to index.html when using webpack-dev-server
  devServer: {
    historyApiFallback: true
  }
};
