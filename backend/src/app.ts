import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import accountRoutes from './routes/accountRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';

export const app = express();

app.use(cors({ origin: config.corsOrigin }));
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

