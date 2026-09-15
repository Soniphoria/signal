const { merge } = require("webpack-merge")
const common = require("./webpack.common.js")
const CopyPlugin = require("copy-webpack-plugin")
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin")
const WorkboxPlugin = require("workbox-webpack-plugin")

module.exports = merge(common, {
  mode: "production",
  output: {
    // Production is only ever reached through the soniphoria.app Cloudflare
    // Worker proxy at /signal/*, which strips this prefix before forwarding
    // to this Vercel deployment's own root. Asset URLs baked into the HTML
    // must therefore include the prefix so the browser re-requests them
    // through the same proxy path instead of soniphoria.app's own root.
    publicPath: "/signal/",
  },
  optimization: {
    concatenateModules: false,
    splitChunks: {
      chunks: "all",
    },
  },
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
    ],
  },
  plugins: [
    new WorkboxPlugin.GenerateSW({
      maximumFileSizeToCacheInBytes: 50000000,
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /^\/.*$/,
          handler: "StaleWhileRevalidate",
        },
        {
          urlPattern: /^.+\.sf2$/,
          handler: "StaleWhileRevalidate",
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com/,
          handler: "StaleWhileRevalidate",
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com/,
          handler: "StaleWhileRevalidate",
        },
      ],
    }),
    new CopyPlugin({
      patterns: [
        { from: "public/*.svg", to: "[name][ext]" },
        { from: "public/*.png", to: "[name][ext]" },
        { from: "public/*.webmanifest", to: "[name][ext]" },
      ],
    }),
    sentryWebpackPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "codingcafe_jp",
      project: "signal",
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      include: "./dist",
      ignore: [
        "node_modules",
        "webpack.common.js",
        "webpack.dev.js",
        "webpack.prod.js",
      ],
      dryRun: process.env.VERCEL_ENV !== "production",
      debug: true,
      errorHandler: (err) => {
        console.warn("Sentry CLI Plugin: " + err.message)
      },
    }),
  ],
})
