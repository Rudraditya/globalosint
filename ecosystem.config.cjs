module.exports = {
  apps: [
    {
      name: 'globalosint',
      script: 'node_modules/vite/bin/vite.js',
      args: '--host 0.0.0.0 --port 5173',
      cwd: 'C:\\Users\\USER\\Documents\\claude-new',
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}
