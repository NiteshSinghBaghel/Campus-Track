import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5005', 10),
  jwtSecret: process.env.JWT_SECRET || 'campus-track-jwt-secret-replace-in-production-min-32-chars',
  encryptionKey: process.env.ENCRYPTION_KEY || 'campus-track-aes-256-gcm-master-key-32-bytes!', // 32 characters for AES-256
  dypiuBaseUrl: process.env.DYPIU_BASE_URL || 'https://erp.dypiu.ac.in',
  mgmBaseUrl: process.env.MGM_BASE_URL || 'https://erp.mgmu.ac.in',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_ANON_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

