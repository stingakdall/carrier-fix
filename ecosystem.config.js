module.exports = {
  apps: [{
    name: 'carrier-marker-bot',
    script: './src/bot.js',
    watch: false,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
