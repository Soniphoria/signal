const { merge } = require("webpack-merge")
const common = require("./webpack.common.js")
const path = require("path")
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin")

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  output: {
    publicPath: "/",
  },
  devServer: {
    port: 3000,
    hot: "only",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
    static: {
      directory: path.resolve(__dirname, "public"),
      watch: true,
    },
    client: {
      overlay: {
        warnings: false,
        errors: true,
      },
    },
    historyApiFallback: {
      rewrites: [
        { from: /^\/projects\/.*\/midi_tracks/, to: "/edit.html" },
        { from: /^\/edit$/, to: "/edit.html" },
        { from: /^\/auth$/, to: "/auth.html" },
        { from: /^\/home$/, to: "/community.html" },
        { from: /^\/profile$/, to: "/community.html" },
        { from: /^\/users\/.*$/, to: "/community.html" },
        { from: /^\/songs\/.*$/, to: "/community.html" },
        { from: /^\//, to: "/index.html" },
      ],
    },
    open: "edit",
  },
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            plugins: [require.resolve("react-refresh/babel")],
          },
        },
      },
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
      },
    ],
  },
  plugins: [
    new ReactRefreshWebpackPlugin({
      exclude: [/node_modules/],
    }),
  ],
  resolve: {
    alias: {
      // Prevent to load local package's react https://github.com/facebook/react/issues/13991#issuecomment-435587809
      react: path.resolve("../node_modules/react"),
    },
  },
})
