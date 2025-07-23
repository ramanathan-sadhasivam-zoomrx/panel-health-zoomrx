# Setup & Deployment Instructions

## 1. Clone the Repository

```sh
git clone <your-repository-url>
cd panel-health-zoomrx
```

## 2. Environment Variables

### A. Client (`.env` in `panel-health-client/`)
Create or update `panel-health-client/.env`

### B. Server (`.env` in `panel-health-server/`)
Create or update `panel-health-server/.env`

## 3. Install Dependencies

### A. Client
```sh
cd panel-health-client
npm install
```

### B. Server
```sh
cd ../panel-health-server
npm install
```

## 4. Build the Client

```sh
cd ../panel-health-client
npm run build
```

## 5. Start Applications with PM2

### A. Start Backend
```sh
cd ../panel-health-server
pm2 start src/server.js --name "panel-health-backend" --env production
```

### B. Start Frontend
```sh
cd ../panel-health-client
pm2 start npm --name "panel-health-frontend" -- start
```

## 6. Configure PM2 for Auto-Start

```sh
pm2 save
pm2 startup
``` 