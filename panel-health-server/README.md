# Panel Health Server

Backend server for the Panel Health Dashboard, providing NPS analytics and survey experience tracking APIs.

## Features

- **NPS Analytics**: Time series data, summary metrics, and detailed breakdowns
- **Survey Management**: CRUD operations for surveys and experience metrics
- **Authentication**: JWT-based authentication system
- **Database Integration**: MySQL database with optimized queries
- **Security**: Rate limiting, CORS, and input validation

## Prerequisites

- Node.js (v16 or higher)
- MySQL database
- npm or yarn

## Installation

1. Clone the repository and navigate to the server directory:
```bash
cd panel-health-server
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp env.example .env
```

4. Configure your environment variables in `.env`:
```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=zoomrx_panel_health
DB_USERNAME=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key_here
CORS_ORIGIN=http://localhost:3000
```

5. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication

- `GET /api/auth/verify` - Verify JWT token

### NPS Analytics
- `GET /api/nps/time-series` - Get NPS time series data
- `GET /api/nps/summary` - Get NPS summary metrics
- `GET /api/nps/detailed` - Get detailed NPS data

### Survey Management
- `GET /api/surveys` - Get all surveys
- `GET /api/surveys/:id` - Get survey by ID
- `GET /api/surveys/metrics/experience` - Get survey experience metrics

## Database Schema

The server expects the following MySQL tables (based on the existing zoomrx-nps-analytics structure):

- `users` - User information
- `surveys` - Survey definitions
- `waves` - Survey waves
- `users_waves` - User participation in waves
- `users_wave_details` - Additional wave details
- `survey_responses` - Survey response data

## Frontend Integration

Update your frontend API calls to point to this server:

```javascript
// Example API call
const response = await fetch('http://localhost:3001/api/nps/time-series', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Development

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests

## Security Features

- JWT authentication
- Rate limiting
- CORS protection
- Input validation
- SQL injection prevention
- Helmet security headers

## Error Handling

The server includes comprehensive error handling with appropriate HTTP status codes and error messages.

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include input validation
4. Write tests for new features
5. Update documentation

## License

MIT License 