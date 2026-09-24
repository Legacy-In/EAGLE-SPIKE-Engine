module.exports = {
  apps: [
    {
      name: 'eagle-flash-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: './apps/web',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
    },
    {
      name: 'eagle-flash-telegram-bot',
      script: 'scripts/telegram_poll.mjs',
      cwd: './',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      restart_delay: 5000,
    },
    {
      name: 'eagle-flash-cloud-scanner',
      script: 'scripts/server_scanner.mjs',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        SCAN_INTERVAL_MS: 30000,
      },
      autorestart: true,
      restart_delay: 5000,
    },
    {
      name: 'eagle-flash-bigcap-worker',
      script: 'scripts/bigcap_worker.mjs',
      cwd: './',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      restart_delay: 5000,
    },
    {
      name: 'eagle-flash-checkpoint-worker',
      script: 'scripts/checkpoint_evaluator.mjs',
      args: '--loop',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        EVAL_INTERVAL_MS: 60000,
      },
      autorestart: true,
      restart_delay: 5000,
    },
  ],
};
