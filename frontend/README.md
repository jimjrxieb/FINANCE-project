# SecureBank Merchant Dashboard - Frontend

> Modern React-based merchant portal for payment transaction management

## Overview

The SecureBank Merchant Dashboard is a responsive web application built with React and TypeScript. It provides merchants with real-time access to payment transactions, analytics, and account management features.

### Features

- 📊 **Real-time Dashboard** - Live transaction metrics and analytics
- 💳 **Transaction Management** - View, search, and filter payment history
- 📈 **Analytics Charts** - Visual insights into payment trends
- 🔐 **Secure Authentication** - JWT-based merchant login
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎨 **Material Design** - Professional UI with Material-UI components

### Technology Stack

- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Charts**: Chart.js with react-chartjs-2
- **Styling**: Emotion (CSS-in-JS)
- **Build Tool**: Create React App

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- Backend API running (default: http://localhost:3000)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The application will open at [http://localhost:3001](http://localhost:3001)

### Environment Configuration

Create a `.env` file in the frontend directory:

```bash
REACT_APP_API_URL=http://localhost:3000
REACT_APP_ENV=development
```

## Project Structure

```
frontend/
├── public/
│   ├── index.html           # HTML template
│   └── favicon.ico          # Application icon
├── src/
│   ├── components/
│   │   ├── Dashboard/       # Dashboard page components
│   │   ├── Transactions/    # Transaction list/details
│   │   ├── Auth/            # Login and registration
│   │   └── Common/          # Shared components
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication state
│   ├── services/
│   │   └── api.ts           # API client configuration
│   ├── types/
│   │   └── index.ts         # TypeScript type definitions
│   ├── utils/
│   │   └── formatters.ts    # Utility functions
│   ├── App.tsx              # Main application component
│   └── index.tsx            # Application entry point
├── Dockerfile               # Container configuration
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── PRD.md                   # Product requirements
└── README.md               # This file
```

## Features

### 1. Dashboard

The main landing page displays:
- **Metrics Cards**: Total transactions, revenue, success rate
- **Recent Transactions**: Last 10 payments
- **Analytics Charts**: Transaction volume, revenue trends, status distribution

```typescript
// Example dashboard data structure
interface DashboardMetrics {
  totalTransactions: number;
  totalRevenue: number;
  successRate: number;
  avgTransactionAmount: number;
}
```

### 2. Transaction Management

View and manage all payment transactions:
- **Search & Filter**: By date range, amount, status, card type
- **Sortable Table**: Click column headers to sort
- **Pagination**: Navigate through large datasets
- **Details View**: Full transaction information
- **Receipt Download**: Direct S3 links to receipts

### 3. Authentication

Secure merchant login system:
- **Login**: Username/password authentication
- **Register**: Create new merchant account
- **JWT Tokens**: Secure API authentication
- **Protected Routes**: Redirect to login if not authenticated

### 4. Analytics

Visual representation of payment data:
- **Line Charts**: Transaction volume over time
- **Bar Charts**: Revenue by time period
- **Pie Charts**: Payment status distribution
- **Interactive**: Hover for detailed information

## API Integration

### Backend Endpoints

The frontend communicates with the backend API:

```typescript
// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Authentication
POST /api/auth/login
POST /api/auth/register

// Payments
GET /api/payments/list
POST /api/payments/process
GET /api/merchants/:id/transactions

// Health
GET /health
```

### API Service

```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

## Development

### Run Development Server

```bash
npm start
```

Opens browser at http://localhost:3001 with hot reloading enabled.

### Build for Production

```bash
npm run build
```

Creates optimized production build in `build/` directory.

### Run Tests

```bash
npm test
```

Launches test runner in interactive watch mode.

### Linting

```bash
npm run lint
```

Check code style with ESLint.

## Docker

### Build Image

```bash
docker build -t securebank-frontend:latest .
```

### Run Container

```bash
docker run -p 3001:3001 \
  -e REACT_APP_API_URL=http://backend:3000 \
  securebank-frontend:latest
```

### Docker Compose

From project root:

```bash
docker-compose up frontend
```

## Deployment

### AWS EKS (Kubernetes)

#### 1. Build and Push to ECR

```bash
# Authenticate
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build
docker build -t securebank-frontend:latest .

# Tag
docker tag securebank-frontend:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/securebank-frontend:latest

# Push
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/securebank-frontend:latest
```

#### 2. Deploy to Kubernetes

```bash
kubectl apply -f infrastructure/k8s/frontend-deployment.yaml
kubectl apply -f infrastructure/k8s/frontend-service.yaml
```

#### 3. Verify Deployment

```bash
kubectl get pods -l app=securebank-frontend
kubectl get svc securebank-frontend
```

## Configuration

### Environment Variables

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3000

# Environment
REACT_APP_ENV=development

# Optional: Analytics
REACT_APP_GA_ID=UA-XXXXXXXXX-X
```

### Build Configuration

Modify `package.json` scripts:

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

## Testing

### Unit Tests

Test individual components:

```bash
npm test
```

Example test:

```typescript
import { render, screen } from '@testing-library/react';
import Dashboard from './components/Dashboard';

test('renders dashboard metrics', () => {
  render(<Dashboard />);
  const element = screen.getByText(/Total Transactions/i);
  expect(element).toBeInTheDocument();
});
```

### Integration Tests

Test user flows:

```typescript
test('user can login and view transactions', async () => {
  // Render login page
  // Fill in credentials
  // Submit form
  // Verify redirect to dashboard
  // Check transactions loaded
});
```

## Styling

### Material-UI Theme

Custom theme configuration:

```typescript
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});
```

### Responsive Design

Breakpoints:

```typescript
theme.breakpoints.values = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
};
```

## Components

### Key Components

#### Dashboard

```tsx
<Dashboard>
  <MetricsCards />
  <RecentTransactions />
  <AnalyticsCharts />
</Dashboard>
```

#### TransactionTable

```tsx
<TransactionTable
  transactions={transactions}
  loading={loading}
  onRowClick={handleRowClick}
  onSort={handleSort}
/>
```

#### PaymentForm

```tsx
<PaymentForm
  onSubmit={handleSubmit}
  loading={loading}
  initialValues={defaultValues}
/>
```

## State Management

### Authentication Context

```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  merchant: Merchant | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);
```

Usage:

```tsx
const { isAuthenticated, merchant, login, logout } = useAuth();
```

## Performance

### Optimization Techniques

- **Code Splitting**: Route-based lazy loading
- **Memoization**: React.memo for expensive components
- **Virtual Scrolling**: For large transaction lists
- **Image Optimization**: Compressed and lazy-loaded
- **Bundle Analysis**: webpack-bundle-analyzer

### Bundle Size

Target bundle sizes:
- Main chunk: < 500KB gzipped
- Vendor chunk: < 300KB gzipped
- Route chunks: < 100KB each

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility

- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Focus indicators
- ARIA labels

## Troubleshooting

### Common Issues

#### Cannot connect to backend

```bash
# Check backend is running
curl http://localhost:3000/health

# Verify REACT_APP_API_URL in .env
echo $REACT_APP_API_URL
```

#### Build fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Port 3001 already in use

```bash
# Change port in package.json
"start": "PORT=3002 react-scripts start"
```

## Dependencies

### Core Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "@mui/material": "^5.14.0",
  "@mui/icons-material": "^5.14.0",
  "@emotion/react": "^11.11.0",
  "@emotion/styled": "^11.11.0",
  "axios": "^1.6.0",
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0"
}
```

### Dev Dependencies

```json
{
  "typescript": "^4.9.5",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@testing-library/react": "^13.4.0",
  "@testing-library/jest-dom": "^5.17.0"
}
```

## Scripts

```bash
# Development
npm start              # Start dev server
npm test               # Run tests
npm run build          # Production build

# Deployment
npm run deploy:dev     # Deploy to dev environment
npm run deploy:prod    # Deploy to production

# Maintenance
npm run lint           # Lint code
npm run format         # Format code
npm run analyze        # Analyze bundle size
```

## Monitoring

### Error Tracking

Integration with error tracking service (future):

```typescript
// Sentry configuration
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.REACT_APP_ENV,
});
```

### Analytics

Google Analytics integration (future):

```typescript
// Google Analytics
import ReactGA from 'react-ga4';

ReactGA.initialize(process.env.REACT_APP_GA_ID);
```

## Contributing

### Development Workflow

1. Create feature branch
2. Make changes
3. Run tests (`npm test`)
4. Build production (`npm run build`)
5. Submit pull request

### Code Style

- Follow TypeScript best practices
- Use functional components with hooks
- Write tests for new features
- Follow Material-UI design patterns

## License

Proprietary - SecureBank Financial Services

## Support

For technical support:
- Email: frontend-team@securebank.com
- Slack: #frontend-dashboard
- Docs: https://docs.securebank.com/dashboard

---

**Version**: 1.0.0
**Last Updated**: 2025-10-08
**Team**: SecureBank Frontend Team