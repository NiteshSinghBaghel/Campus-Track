import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import accountRoutes from './routes/accountRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';

export const app = express();

// CORS: allow Vercel frontend + local dev
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  ...(config.corsOrigin && config.corsOrigin !== '*'
    ? config.corsOrigin.split(',').map(o => o.trim())
    : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (config.corsOrigin === '*') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Health & Info Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Campus Track Backend',
    university: 'D. Y. Patil International University (DYPIU)',
    targetPortal: config.dypiuBaseUrl,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/accounts', accountRoutes);
app.use('/api/attendance', attendanceRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export default app;


