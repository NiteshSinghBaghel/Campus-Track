import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import { multiAccountService } from './services/multiAccountService.js';

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

// Admin: Export all accounts as base64 (for setting ACCOUNTS_DATA env var on Render)
// Protected by ADMIN_SECRET env var
app.get('/api/admin/export-accounts', (req, res) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.query.secret !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    // Get all accounts from service (we expose a raw method)
    const accounts = (multiAccountService as any).accounts;
    const data = Array.from((accounts as Map<string, any>).values());
    // Strip encrypted credentials from export for safety (keep only metadata)
    const safe = data.map((a: any) => ({ ...a }));
    const b64 = Buffer.from(JSON.stringify(safe)).toString('base64');
    res.json({
      count: safe.length,
      ACCOUNTS_DATA: b64,
      instruction: 'Set this value as ACCOUNTS_DATA environment variable in Render dashboard'
    });
  } catch (e) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/attendance', attendanceRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export default app;

