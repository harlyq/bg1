const path = require('path')

const PATHS = {
  app: path.join(__dirname, 'app'),
  dist: path.join(__dirname, 'dist'),
}

module.exports = {
  entry: {
    canasta: `${PATHS.app}/canasta/game-canasta.js`,
    mancala: `${PATHS.app}/mancala/game-mancala.js`,
  },
  output: {
    path: PATHS.dist,
    publicPath: '/dist/', // webpack-dev-server will make the output file 'appear' here (note, it is never saved to disk)
    filename: 'game-[name]-dist.js',
  },
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
    ]
  },
}
