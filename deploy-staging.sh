#!/bin/bash

set -e

echo "🚀 Starting Panel Health ZoomRx staging deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "ecosystem.config.js" ]; then
    print_error "Please run this script from the panel-health-zoomrx root directory"
    exit 1
fi

# Create logs directory
print_status "Creating logs directory..."
mkdir -p logs

# Pull latest changes (if git repo)
if [ -d ".git" ]; then
    print_status "Pulling latest changes from git..."
    git pull origin main
fi

# Backend deployment
print_status "Deploying backend..."
cd panel-health-server

# Install dependencies
print_status "Installing backend dependencies..."
npm install --production

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning "Backend .env file not found. Please create it from env.example"
    print_status "Creating .env from env.example..."
    cp env.example .env
    print_warning "Please edit .env file with your staging configuration"
fi

# Frontend deployment
print_status "Deploying frontend..."
cd ../panel-health-client

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

# Build for production
print_status "Building frontend for production..."
npm run build

# Go back to root directory
cd ..

# Start/Reload applications with PM2
print_status "Starting applications with PM2..."
pm2 start ecosystem.config.js --env staging || pm2 reload ecosystem.config.js --env staging

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Show deployment status
print_status "Deployment completed successfully!"
echo
print_status "Current PM2 processes:"
pm2 list

echo
print_status "Recent logs:"
pm2 logs --lines 10

echo
print_status "Health check endpoints:"
echo "Backend: http://localhost:3003/api/health"
echo "Frontend: http://localhost:3000"

echo
print_status "Useful PM2 commands:"
echo "  pm2 monit                    - Monitor processes"
echo "  pm2 logs                     - View all logs"
echo "  pm2 restart <app-name>       - Restart specific app"
echo "  pm2 reload <app-name>        - Zero-downtime reload"
echo "  pm2 scale <app-name> <num>   - Scale application instances"
echo "  pm2 stop all                 - Stop all applications"
echo "  pm2 delete all               - Remove all applications from PM2" 