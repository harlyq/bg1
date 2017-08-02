const path = require('path')

const PATHS = {
  app: path.join(__dirname, 'app'),
}

module.exports = {
  entry: {
    app: `${PATHS.app}/game-canasta.js`,
  },
  output: {
    path: PATHS.app,
    publicPath: '/app/', // webpack-dev-server will make the output file 'appear' here (note, it is never saved to disk)
    filename: 'game-canasta-dist.js',
  }
}
