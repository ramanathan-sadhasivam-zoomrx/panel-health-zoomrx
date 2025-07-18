module.exports = {
  apps: [
    {
      name: 'panel-health-backend',
      cwd: './panel-health-server',
      script: 'src/server.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3003
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3003
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      error_file: './logs/panel-health-backend-error.log',
      out_file: './logs/panel-health-backend-out.log',
      log_file: './logs/panel-health-backend-combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 3000,
      autorestart: true
    },
    {
      name: 'panel-health-frontend',
      cwd: './panel-health-client',
      script: 'npm',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: 1
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: 1
      },
      error_file: './logs/panel-health-frontend-error.log',
      out_file: './logs/panel-health-frontend-out.log',
      log_file: './logs/panel-health-frontend-combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 8000,
      autorestart: true
    }
  ],

  // PM2 deployment configuration
  deploy: {
    staging: {
      user: 'deploy',
      host: 'your-staging-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/panel-health-zoomrx.git',
      path: '/var/www/panel-health-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': ''
    },
    production: {
      user: 'deploy',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/panel-health-zoomrx.git',
      path: '/var/www/panel-health-production',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}; 