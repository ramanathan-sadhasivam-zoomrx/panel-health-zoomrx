# Panel Health ZoomRx - Staging Deployment Guide

This guide covers deploying the Panel Health ZoomRx application to a staging environment using PM2.

## 🏗️ Architecture Overview

The application consists of:
- **Frontend**: Next.js application (panel-health-client)
- **Backend**: Node.js/Express API server (panel-health-server)
- **Database**: MySQL 8.0+

## 📋 Prerequisites

### Server Requirements
- Ubuntu 20.04+ or CentOS 8+
- Node.js 18+ 
- MySQL 8.0+
- PM2 (Process Manager)
- Nginx (Reverse Proxy)
- Git

### Install Node.js and PM2
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install PM2 startup script
pm2 startup
```

### Install MySQL
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

### Install Nginx
```bash
sudo apt install nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 🚀 Deployment Steps

### 1. Server Setup

```bash
# Clone the repository to any directory you prefer
git clone <your-repo-url> panel-health-zoomrx
cd panel-health-zoomrx

# The ecosystem.config.js uses relative paths, so it will work from any location
```

### 2. Database Setup

```bash
# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE zoomrx_nps_staging;
CREATE USER 'panel_health_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON zoomrx_nps_staging.* TO 'panel_health_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Backend Deployment

```bash
cd /var/www/panel-health-zoomrx/panel-health-server

# Install dependencies
npm install --production

# Create environment file
cp env.example .env
```

Edit `.env` for staging:
```env
# Server Configuration
PORT=3003
NODE_ENV=staging

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=zoomrx_nps_staging
DB_USERNAME=panel_health_user
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your-staging-secret-key-here
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=https://staging.panel-health.zoomrx.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Frontend Deployment

```bash
cd /var/www/panel-health-zoomrx/panel-health-client

# Install dependencies
npm install

# Build for production
npm run build
```

### 5. PM2 Configuration

The `ecosystem.config.js` file is already included in the repository and uses relative paths, so it will work from any directory where you clone the repo.
```javascript
module.exports = {
  apps: [
    {
      name: 'panel-health-backend',
      cwd: '/var/www/panel-health-zoomrx/panel-health-server',
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
      error_file: '/var/log/pm2/panel-health-backend-error.log',
      out_file: '/var/log/pm2/panel-health-backend-out.log',
      log_file: '/var/log/pm2/panel-health-backend-combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10
    },
    {
      name: 'panel-health-frontend',
      cwd: '/var/www/panel-health-zoomrx/panel-health-client',
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
      error_file: '/var/log/pm2/panel-health-frontend-error.log',
      out_file: '/var/log/pm2/panel-health-frontend-out.log',
      log_file: '/var/log/pm2/panel-health-frontend-combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10
    }
  ]
};
```

### 6. Start Applications with PM2

```bash
# Make deployment script executable
chmod +x deploy-staging.sh

# Run the deployment script
./deploy-staging.sh

# Or manually start applications
pm2 start ecosystem.config.js --env staging

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### 7. Nginx Configuration

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/panel-health-staging
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name staging.panel-health.zoomrx.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.panel-health.zoomrx.com;

    # SSL Configuration (add your SSL certificates)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3003/health;
        access_log off;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/panel-health-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d staging.panel-health.zoomrx.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 PM2 Management Commands

```bash
# View all processes
pm2 list

# Monitor processes
pm2 monit

# View logs
pm2 logs panel-health-backend
pm2 logs panel-health-frontend

# Restart applications
pm2 restart panel-health-backend
pm2 restart panel-health-frontend

# Stop applications
pm2 stop panel-health-backend
pm2 stop panel-health-frontend

# Delete applications
pm2 delete panel-health-backend
pm2 delete panel-health-frontend

# Reload applications (zero-downtime)
pm2 reload panel-health-backend
pm2 reload panel-health-frontend

# Scale applications
pm2 scale panel-health-backend 4
pm2 scale panel-health-frontend 4
```

## 📊 Monitoring and Logs

### PM2 Logs
```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs panel-health-backend --lines 100

# Clear logs
pm2 flush
```

### Application Logs
```bash
# Backend logs
tail -f /var/log/pm2/panel-health-backend-combined.log

# Frontend logs
tail -f /var/log/pm2/panel-health-frontend-combined.log
```

### Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Deployment Script

Create a deployment script `deploy.sh`:
```bash
#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Pull latest changes
git pull origin main

# Backend deployment
echo "📦 Deploying backend..."
cd panel-health-server
npm install --production
pm2 reload panel-health-backend

# Frontend deployment
echo "📦 Deploying frontend..."
cd ../panel-health-client
npm install
npm run build
pm2 reload panel-health-frontend

echo "✅ Deployment completed successfully!"
pm2 list
```

Make it executable:
```bash
chmod +x deploy.sh
```

## 🔍 Health Checks

### Application Health
```bash
# Backend health
curl https://staging.panel-health.zoomrx.com/api/health

# Frontend health
curl -I https://staging.panel-health.zoomrx.com
```

### Database Health
```bash
# Test database connection
mysql -u panel_health_user -p zoomrx_nps_staging -e "SELECT 1;"
```

## 🛡️ Security Considerations

1. **Firewall Configuration**
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

2. **Database Security**
- Use strong passwords
- Limit database user privileges
- Enable SSL connections

3. **Application Security**
- Keep dependencies updated
- Use environment variables for secrets
- Enable rate limiting
- Implement proper CORS policies

## 📈 Performance Optimization

1. **PM2 Clustering**
- Use multiple instances for load balancing
- Monitor memory usage and restart if needed

2. **Nginx Optimization**
- Enable gzip compression
- Configure caching headers
- Use HTTP/2

3. **Database Optimization**
- Optimize MySQL configuration
- Use connection pooling
- Monitor slow queries

## 🔧 Troubleshooting

### Common Issues

1. **Port Already in Use**
```bash
# Check what's using the port
sudo netstat -tulpn | grep :3003
sudo netstat -tulpn | grep :3000

# Kill process if needed
sudo kill -9 <PID>
```

2. **Permission Issues**
```bash
# Fix file permissions
sudo chown -R $USER:$USER /var/www/panel-health-zoomrx
sudo chmod -R 755 /var/www/panel-health-zoomrx
```

3. **Database Connection Issues**
```bash
# Test database connection
mysql -u panel_health_user -p -h localhost zoomrx_nps_staging
```

4. **PM2 Process Not Starting**
```bash
# Check PM2 logs
pm2 logs

# Restart PM2 daemon
pm2 kill
pm2 resurrect
```

## 📞 Support

For deployment issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check application logs in `/var/log/pm2/`
4. Verify environment variables and database connectivity

---

**Note**: Replace placeholder values (URLs, passwords, certificates) with your actual staging environment values. 