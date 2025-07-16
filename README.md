# Panel Health Dashboard - ZoomRx

A survey experience tracking dashboard for ZoomRx panel health management.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+

### Installation

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd panel-health-zoomrx
   ```

2. **Backend Setup**
   ```bash
   cd panel-health-server
   npm install
   cp env.example .env
   # Configure database credentials in .env
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd panel-health-client
   npm install
   npm run dev
   ```

4. **Access**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3003

## 📊 Features

- **Survey Experience Tracker**: Top 5 and Lowest 5 surveys
- **NPS Tracker**: Trend analysis and metrics
- **Experience Score**: Multi-factor scoring system
- **Real-time Data**: Live survey performance metrics

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, MySQL
- **Charts**: Recharts
- **UI**: shadcn/ui components

## 📈 Experience Score Formula

```
Score = (User Rating × 35%) + (Sentiment × 25%) + (Drop-off × 20%) + (Screen-out × 15%) + (Screener × 5%)
```

## 🔧 Environment Variables

```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database
JWT_SECRET=your_jwt_secret
PORT=3003
```

## 📝 API Endpoints

- `GET /api/surveys` - All surveys with experience scores
- `GET /api/nps` - NPS data and trends
- `GET /health` - Health check

---

**Built for ZoomRx Panel Health Management** 