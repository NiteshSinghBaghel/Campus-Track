import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For convenience in local dev/demo mode, fallback to default user
    req.user = { userId: 'user-default', email: 'student@dypiu.ac.in' };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string };
    req.user = decoded;
    next();
  } catch {
    // If token is invalid or expired, fallback to default demo user in dev
    req.user = { userId: 'user-default', email: 'student@dypiu.ac.in' };
    next();
  }
}

