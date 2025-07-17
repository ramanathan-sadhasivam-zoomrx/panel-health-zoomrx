#!/bin/bash

echo "🚀 Installing dependencies for Panel Health ZoomRx..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "ecosystem.config.js" ]; then
    print_warning "Please run this script from the panel-health-zoomrx root directory"
    exit 1
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
cd panel-health-server
npm install
cd ..

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd panel-health-client
npm install
cd ..

print_status "Dependencies installed successfully!"
echo
print_status "Next steps:"
echo "1. Configure your .env file in panel-health-server/"
echo "2. Start the backend: cd panel-health-server && npm run dev"
echo "3. Start the frontend: cd panel-health-client && npm run dev" 