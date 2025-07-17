module.exports = {
  apps: [
    {
      name: 'panel-health-backend',
      cwd: './panel-health-server',
      script: 'src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'staging',
        PORT: 3003
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3003
      },
      error_file: './logs/panel-health-backend-error.log',
      out_file: './logs/panel-health-backend-out.log',
      log_file: './logs/panel-health-backend-combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10
    },
    {
      name: 'panel-health-frontend',
      cwd: './panel-health-client',
      script: 'npm',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'staging',
        PORT: 3000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000
      },
      error_file: './logs/panel-health-frontend-error.log',
      out_file: './logs/panel-health-frontend-out.log',
      log_file: './logs/panel-health-frontend-combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10
    }
  ]
}; 