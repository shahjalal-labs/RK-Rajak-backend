module.exports = {
  apps: [
    {
      name: "server",
      script: "./dist/server.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "email-worker",
      script: "./dist/workers/email.worker.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
